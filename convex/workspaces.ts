import {query,mutation,internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {workspace} from './access';
const kind=v.union(v.literal('personal'),v.literal('trial'),v.literal('owner'));
export const create=mutation({args:{workspaceToken:v.string()},returns:v.null(),handler:async(ctx,{workspaceToken})=>{
 if(!/^[a-f0-9]{64}$/.test(workspaceToken))throw new Error('Invalid workspace.');
 const saved=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',workspaceToken)).unique();if(!saved)await ctx.db.insert('workspaces',{token:workspaceToken,kind:'personal'});return null;
}});
export const info=query({args:{workspaceToken:v.string()},returns:v.object({kind}),handler:async(ctx,{workspaceToken})=>({kind:(await workspace(ctx,workspaceToken)).kind})});
export const check=internalQuery({args:{workspaceToken:v.string()},returns:v.id('workspaces'),handler:async(ctx,{workspaceToken})=>(await workspace(ctx,workspaceToken))._id});
export const recordFile=internalMutation({args:{workspaceId:v.id('workspaces'),storageId:v.id('_storage')},returns:v.null(),handler:async(ctx,args)=>{await ctx.db.insert('fileOwners',args);return null;}});
export const preserveExisting=internalMutation({args:{workspaceToken:v.string()},returns:v.object({episodes:v.number(),segments:v.number()}),handler:async(ctx,{workspaceToken})=>{
 if(!/^[a-f0-9]{64}$/.test(workspaceToken))throw new Error('Invalid owner key.');
 const existing=await ctx.db.query('workspaces').withIndex('by_kind',q=>q.eq('kind','owner')).unique();
 const workspaceId=existing?existing._id:await ctx.db.insert('workspaces',{token:workspaceToken,kind:'owner'});
 if(existing&&existing.token!==workspaceToken)throw new Error('Owner workspace already exists.');
 const legacy=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',undefined)).take(1000);let segments=0;
 for(const episode of legacy){await ctx.db.patch(episode._id,{workspaceId});segments+=(await ctx.db.query('segments').withIndex('by_episode',q=>q.eq('episodeId',episode._id)).take(10000)).length;await ctx.db.insert('fileOwners',{workspaceId,storageId:episode.storageId});}
 for(const table of ['labelLists','metadataFields','metadataDefaults'] as const){const settings=await ctx.db.query(table).withIndex('by_workspace',q=>q.eq('workspaceId',undefined)).take(100);for(const row of settings)await ctx.db.patch(row._id,{workspaceId});}
 return {episodes:legacy.length,segments};
}});
