"use node";
import {action,internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {uploadArgs} from './marketing';
import {r2Client} from './r2Client';
import {PutObjectCommand,HeadObjectCommand,CopyObjectCommand,DeleteObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import type {Id,Doc} from './_generated/dataModel';
import {UPLOAD_LIFETIME} from './freeLimits';
export const begin=action({args:uploadArgs,returns:v.object({uploadId:v.id('marketingUploads'),url:v.string()}),handler:async(ctx,args):Promise<{uploadId:Id<'marketingUploads'>;url:string}>=>{const key=`marketing/staging/${crypto.randomUUID()}`;const uploadId=await ctx.runMutation(internal.marketing.reserve,{...args,key});const {client,bucket}=r2Client();return {uploadId,url:await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:args.mime,ContentLength:args.size}),{expiresIn:3600})};}});
export const resume=action({args:{uploadId:v.id('marketingUploads')},returns:v.string(),handler:async(ctx,args):Promise<string>=>{const row:Doc<'marketingUploads'>=await ctx.runQuery(internal.marketing.pendingUpload,args);const expiresIn=Math.min(3600,Math.floor((row.createdAt+UPLOAD_LIFETIME-Date.now())/1000));if(row.completed||row.stagingCleanedAt!==undefined||expiresIn<=0)throw new Error('Upload expired or already completed.');const {client,bucket}=r2Client();return getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:row.key,ContentType:row.mime,ContentLength:row.size}),{expiresIn});}});
export const complete=action({args:{uploadId:v.id('marketingUploads')},returns:v.any(),handler:async(ctx,{uploadId}):Promise<any>=>{
 const row:Doc<'marketingUploads'>=await ctx.runQuery(internal.marketing.pendingUpload,{uploadId});
 if(!row.completed){
  if(Date.now()-row.createdAt>UPLOAD_LIFETIME)throw new Error('Upload expired. Your local file is unchanged; choose it again.');
  const {client,bucket}=r2Client();
  const head=await client.send(new HeadObjectCommand({Bucket:bucket,Key:row.key}));
  if(head.ContentLength!==row.size||head.ContentType!==row.mime)throw new Error('Upload is incomplete. Retry the upload.');
  // The signed staging URL must never be able to overwrite the saved video.
  const key=`marketing/${row.kind}/${row.ownerId}/${row._id}`;
  await client.send(new CopyObjectCommand({Bucket:bucket,Key:key,CopySource:`${bucket}/${row.key}`,CopySourceIfMatch:head.ETag}));
 }
 const result=await ctx.runMutation(internal.marketing.finishUpload,{uploadId,key:row.completed?row.finalKey!:`marketing/${row.kind}/${row.ownerId}/${row._id}`});
 // Wait only for durable scheduling, not another R2 request. A completion retry is safe.
 await ctx.scheduler.runAfter(0,internal.marketingFiles.cleanCompletedStaging,{uploadId});
 return result;
}});
export const cleanCompletedStaging=internalAction({args:{uploadId:v.id('marketingUploads'),attempt:v.optional(v.number())},returns:v.null(),handler:async(ctx,{uploadId,attempt=0}):Promise<null>=>{
 const key:string|null=await ctx.runQuery(internal.marketing.completedStagingKey,{uploadId});
 if(!key)return null;
 const {client,bucket}=r2Client();
 try{await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));}
 catch(error){
  const retryDelays=[1_000,10_000,60_000];
  if(!Number.isInteger(attempt)||attempt<0||attempt>=retryDelays.length)throw error;
  await ctx.scheduler.runAfter(retryDelays[attempt],internal.marketingFiles.cleanCompletedStaging,{uploadId,attempt:attempt+1});
 }
 // Do not mark stagingCleanedAt yet: a still-valid PUT can recreate this key.
 // The expiry cleanup remains responsible for its final deletion and accounting.
 return null;
}});
// Only the HTTP proxy can obtain this URL. Never return it to a browser client.
export const streamUrl=internalAction({args:{token:v.string(),assetId:v.string(),publicLink:v.boolean()},returns:v.string(),handler:async(ctx,args):Promise<string>=>{const asset=await ctx.runQuery(internal.marketing.media,args);const {client,bucket}=r2Client();return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:asset.key}),{expiresIn:30});}});
export const cleanStaging=internalAction({args:{},returns:v.null(),handler:async(ctx):Promise<null>=>{const rows=await ctx.runQuery(internal.marketing.staleUploads,{});if(!rows.length)return null;const {client,bucket}=r2Client();for(const row of rows){for(const key of row.keys)await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));await ctx.runMutation(internal.marketing.stagingCleaned,{uploadId:row.id});}return null;}});
export const finalise=action({args:{cardId:v.id('marketingCards'),snapshot:v.string(),confirmed:v.boolean()},returns:v.null(),handler:async(ctx,{cardId,snapshot,confirmed})=>{if(!confirmed)throw new Error('Explicit deletion confirmation is required.');const plan:{remove:{id:Id<'marketingVersions'>;key:string}[];done:boolean}=await ctx.runMutation(internal.marketing.startCleanup,{cardId,snapshot});if(plan.done)return null;const {client,bucket}=r2Client();try{for(const row of plan.remove){const key=await ctx.runQuery(internal.marketing.deletionGuard,{cardId,versionId:row.id});await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));await ctx.runMutation(internal.marketing.markDeleted,{cardId,versionId:row.id});}await ctx.runMutation(internal.marketing.completeCleanup,{cardId});}catch(error){await ctx.runMutation(internal.marketing.cleanupFailure,{cardId,error:error instanceof Error?error.message:'Storage cleanup failed.'});throw error;}return null;}});
