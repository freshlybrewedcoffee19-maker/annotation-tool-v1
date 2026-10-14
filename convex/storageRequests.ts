import {mutation,query,internalMutation,internalAction,type QueryCtx} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import type {Doc,Id} from './_generated/dataModel';
import {FREE_STORAGE,userUsage} from './freeLimits';
import {sendStorageRequestEmail,type StorageRequestEmailPayload} from './storageRequestEmail';

const DAY=86_400_000,MAX_ATTEMPTS=4,LEASE=120_000,RETRY_DELAY=[60_000,300_000,1_800_000];
const state=v.union(v.literal('queued'),v.literal('sending'),v.literal('sent'),v.literal('failed'));
const statusValue=v.object({requestId:v.id('storageRequests'),status:state,retryAt:v.union(v.number(),v.null()),createdAt:v.number(),sentAt:v.union(v.number(),v.null())});
const deliveryValue=v.union(v.object({ok:v.literal(true),providerId:v.string()}),v.object({ok:v.literal(false),failureCode:v.union(v.literal('configuration'),v.literal('rejected'),v.literal('temporary'),v.literal('unknown'))}));
function publicStatus(row:Doc<'storageRequests'>){return {requestId:row._id,status:row.status,retryAt:row.retryAt??null,createdAt:row.createdAt,sentAt:row.sentAt??null};}
async function account(ctx:QueryCtx){const userId=await getAuthUserId(ctx),user=userId?await ctx.db.get(userId):null;if(!userId||!user?.email||user.isAnonymous)throw new Error('Sign in to request extra storage.');if(user.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))throw new Error('Your account needs a valid email before requesting storage.');return {userId,user};}

export const request=mutation({args:{source:v.union(v.literal('marketing'),v.literal('annotation')),requestedBytes:v.optional(v.number())},returns:statusValue,handler:async(ctx,{source,requestedBytes=0})=>{
 const {userId,user}=await account(ctx),now=Date.now();
 if(!Number.isSafeInteger(requestedBytes)||requestedBytes<0||requestedBytes>5_000_000_000)throw new Error('Requested upload size is invalid.');
 const latest=await ctx.db.query('storageRequests').withIndex('by_user_created',q=>q.eq('userId',userId)).order('desc').first();
 if(latest&&now-latest.createdAt<DAY){
  if(latest.status!=='failed'||latest.attempts>=MAX_ATTEMPTS||(latest.retryAt??0)>now)return publicStatus(latest);
  await ctx.db.patch(latest._id,{status:'queued',retryAt:now,updatedAt:now,failureCode:undefined});
  await ctx.scheduler.runAfter(0,internal.storageRequests.deliver,{requestId:latest._id});
  return publicStatus({...latest,status:'queued',retryAt:now,updatedAt:now});
 }
 const usage=await userUsage(ctx,userId);
 const requestId=await ctx.db.insert('storageRequests',{userId,name:(user.name??'').replace(/[\r\n]/g,' ').slice(0,120),email:user.email!,source,requestedBytes,storedBytes:usage.stored,reservedBytes:usage.reserved,storageLimit:FREE_STORAGE,rateUsdPerGbMonth:.02,createdAt:now,updatedAt:now,status:'queued',attempts:0,retryAt:now});
 await ctx.scheduler.runAfter(0,internal.storageRequests.deliver,{requestId});
 return {requestId,status:'queued' as const,retryAt:now,createdAt:now,sentAt:null};
}});

export const status=query({args:{requestId:v.id('storageRequests')},returns:statusValue,handler:async(ctx,{requestId})=>{const {userId}=await account(ctx),row=await ctx.db.get(requestId);if(!row||row.userId!==userId)throw new Error('Storage request not found.');return publicStatus(row);}});

const claimValue=v.object({requestId:v.id('storageRequests'),attempt:v.number(),userId:v.id('users'),name:v.string(),email:v.string(),source:v.union(v.literal('marketing'),v.literal('annotation')),storedBytes:v.number(),reservedBytes:v.number(),storageLimit:v.number(),requestedBytes:v.number(),rateUsdPerGbMonth:v.number(),createdAt:v.number()});
export const claim=internalMutation({args:{requestId:v.id('storageRequests')},returns:v.union(v.null(),claimValue),handler:async(ctx,{requestId})=>{
 const row=await ctx.db.get(requestId),now=Date.now();
 if(!row||row.status==='sent'||row.status==='failed'||row.status==='queued'&&(row.retryAt??0)>now||row.status==='sending'&&(row.deliveryLeaseUntil??0)>now)return null;
 if(row.attempts>=MAX_ATTEMPTS||now-row.createdAt>=DAY){await ctx.db.patch(requestId,{status:'failed',failureCode:'unknown',retryAt:Math.max(now,row.createdAt+DAY),deliveryLeaseUntil:undefined,updatedAt:now});return null;}
 const attempt=row.attempts+1;
 await ctx.db.patch(requestId,{status:'sending',attempts:attempt,deliveryLeaseUntil:now+LEASE,retryAt:undefined,updatedAt:now});
 // If a server process stops after claiming the request, this watchdog can retry.
 await ctx.scheduler.runAfter(LEASE,internal.storageRequests.deliver,{requestId});
 return {requestId,attempt,userId:row.userId,name:row.name,email:row.email,source:row.source,storedBytes:row.storedBytes,reservedBytes:row.reservedBytes,storageLimit:row.storageLimit,requestedBytes:row.requestedBytes,rateUsdPerGbMonth:row.rateUsdPerGbMonth,createdAt:row.createdAt};
}});

export const delivered=internalMutation({args:{requestId:v.id('storageRequests'),attempt:v.number(),result:deliveryValue},returns:v.null(),handler:async(ctx,{requestId,attempt,result})=>{
 const row=await ctx.db.get(requestId),now=Date.now();if(!row||row.status==='sent')return null;
 if(result.ok){if(attempt>row.attempts)return null;await ctx.db.patch(requestId,{status:'sent',sentAt:now,providerId:result.providerId,retryAt:undefined,deliveryLeaseUntil:undefined,failureCode:undefined,updatedAt:now});return null;}
 if(row.status!=='sending'||attempt!==row.attempts)return null;
 const retry=result.failureCode==='temporary'&&attempt<MAX_ATTEMPTS&&now-row.createdAt<DAY-LEASE;
 const retryAt=attempt>=MAX_ATTEMPTS?row.createdAt+DAY:now+(retry?RETRY_DELAY[attempt-1]:60_000);
 await ctx.db.patch(requestId,{status:retry?'queued':'failed',failureCode:result.failureCode,retryAt,deliveryLeaseUntil:undefined,updatedAt:now});
 if(retry)await ctx.scheduler.runAfter(retryAt-now,internal.storageRequests.deliver,{requestId});
 return null;
}});

export const deliver=internalAction({args:{requestId:v.id('storageRequests')},returns:v.null(),handler:async(ctx,{requestId}):Promise<null>=>{
 const claimed:StorageRequestEmailPayload&{requestId:Id<'storageRequests'>;attempt:number}|null=await ctx.runMutation(internal.storageRequests.claim,{requestId});
 if(!claimed)return null;
 const result=await sendStorageRequestEmail(claimed);
 await ctx.runMutation(internal.storageRequests.delivered,{requestId,attempt:claimed.attempt,result});return null;
}});
