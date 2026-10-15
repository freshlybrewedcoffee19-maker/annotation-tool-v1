import {query,mutation,internalMutation,internalQuery} from './_generated/server';
import {v} from 'convex/values';
import {workspace} from './access';
import {internal} from './_generated/api';
import {segmentAccountFields,workspaceAccountType} from './workspaceGroups';
const kind=v.union(v.literal('personal'),v.literal('trial'),v.literal('owner'));
export const create=mutation({args:{workspaceToken:v.string()},returns:v.null(),handler:async(ctx,{workspaceToken})=>{
 if(!/^[a-f0-9]{64}$/.test(workspaceToken))throw new Error('Invalid workspace.');
 const saved=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',workspaceToken)).unique();if(!saved)await ctx.db.insert('workspaces',{token:workspaceToken,kind:'personal',accountType:'anonymous'});return null;
}});
export const info=query({args:{workspaceToken:v.string()},returns:v.object({kind}),handler:async(ctx,{workspaceToken})=>({kind:(await workspace(ctx,workspaceToken)).kind})});
export const check=internalQuery({args:{workspaceToken:v.string()},returns:v.id('workspaces'),handler:async(ctx,{workspaceToken})=>(await workspace(ctx,workspaceToken))._id});
export const recordFile=internalMutation({args:{workspaceId:v.id('workspaces'),storageId:v.id('_storage')},returns:v.null(),handler:async(ctx,args)=>{await ctx.db.insert('fileOwners',args);return null;}});
export const preserveExisting=internalMutation({args:{workspaceToken:v.string()},returns:v.object({episodes:v.number(),segments:v.number()}),handler:async(ctx,{workspaceToken}):Promise<{episodes:number;segments:number}>=>{
 if(!/^[a-f0-9]{64}$/.test(workspaceToken))throw new Error('Invalid owner key.');
 const existing=await ctx.db.query('workspaces').withIndex('by_kind',q=>q.eq('kind','owner')).unique();
 const workspaceId=existing?existing._id:await ctx.db.insert('workspaces',{token:workspaceToken,kind:'owner',accountType:'anonymous'});
 if(existing&&existing.token!==workspaceToken)throw new Error('Owner workspace already exists.');
 const legacy=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',undefined)).take(1000);let segments=0;
 for(const episode of legacy){await ctx.db.patch(episode._id,{workspaceId});segments+=(await ctx.db.query('segments').withIndex('by_episode',q=>q.eq('episodeId',episode._id)).take(10000)).length;await ctx.scheduler.runAfter(0,internal.workspaces.refreshEpisodeSegmentGroups,{episodeId:episode._id});if(episode.storageId)await ctx.db.insert('fileOwners',{workspaceId,storageId:episode.storageId});}
 for(const table of ['labelLists','metadataFields','metadataDefaults'] as const){const settings=await ctx.db.query(table).withIndex('by_workspace',q=>q.eq('workspaceId',undefined)).take(100);for(const row of settings)await ctx.db.patch(row._id,{workspaceId});}
 return {episodes:legacy.length,segments};
}});

// Ownership changes can cover many videos. Keep each update bounded and derive
// ownership again in each batch so a delayed job cannot restore an old group.
export const refreshWorkspaceSegmentGroups=internalMutation({
 args:{workspaceId:v.id('workspaces'),cursor:v.optional(v.string())},returns:v.null(),
 handler:async(ctx,{workspaceId,cursor}):Promise<null>=>{
  const space=await ctx.db.get(workspaceId);if(!space)return null;
  const accountType=await workspaceAccountType(ctx,space);
  if(space.accountType!==accountType)await ctx.db.patch(workspaceId,{accountType});
  const page=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',workspaceId)).paginate({numItems:50,cursor:cursor??null});
  for(const episode of page.page)await ctx.scheduler.runAfter(0,internal.workspaces.refreshEpisodeSegmentGroups,{episodeId:episode._id});
  if(!page.isDone)await ctx.scheduler.runAfter(0,internal.workspaces.refreshWorkspaceSegmentGroups,{workspaceId,cursor:page.continueCursor});
  return null;
 }
});

export const refreshEpisodeSegmentGroups=internalMutation({
 args:{episodeId:v.id('episodes'),cursor:v.optional(v.string())},returns:v.null(),
 handler:async(ctx,{episodeId,cursor}):Promise<null>=>{
  const grouping=await segmentAccountFields(ctx,await ctx.db.get(episodeId));
  const page=await ctx.db.query('segments').withIndex('by_episode',q=>q.eq('episodeId',episodeId)).paginate({numItems:100,cursor:cursor??null});
  for(const segment of page.page){
   if(segment.accountType!==grouping.accountType||segment.workspaceId!==grouping.workspaceId)
    await ctx.db.patch(segment._id,{accountType:grouping.accountType,workspaceId:grouping.workspaceId});
  }
  if(!page.isDone)await ctx.scheduler.runAfter(0,internal.workspaces.refreshEpisodeSegmentGroups,{episodeId,cursor:page.continueCursor});
  return null;
 }
});

