import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
import type {Id} from './_generated/dataModel';
import {ownedEpisode,workspace} from './access';
import {canonical} from './trialHistoryHelpers';
import {segmentAccountFields} from './workspaceGroups';

const item=v.union(v.null(),v.object({id:v.id('trialEditHistory'),description:v.string()}));
export const status=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.object({undo:item,redo:item}),handler:async(ctx,args)=>{
 await ownedEpisode(ctx,args.workspaceToken,args.episodeId);const space=await workspace(ctx,args.workspaceToken);
 if(space.kind!=='trial')return {undo:null,redo:null};
 const undo=await ctx.db.query('trialEditHistory').withIndex('by_episode_state',q=>q.eq('episodeId',args.episodeId).eq('undone',false)).order('desc').first();
 const redo=await ctx.db.query('trialEditHistory').withIndex('by_episode_state',q=>q.eq('episodeId',args.episodeId).eq('undone',true)).order('asc').first();
 return {undo:undo?{id:undo._id,description:undo.description}:null,redo:redo?{id:redo._id,description:redo.description}:null};
}});
export const apply=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),entryId:v.id('trialEditHistory'),direction:v.union(v.literal('undo'),v.literal('redo'))},returns:v.null(),handler:async(ctx,args)=>{
 await ownedEpisode(ctx,args.workspaceToken,args.episodeId);const space=await workspace(ctx,args.workspaceToken);
 if(space.kind!=='trial')throw Error('These controls are available in the trial only.');
 const undo=args.direction==='undo';
 const entry=await ctx.db.query('trialEditHistory').withIndex('by_episode_state',q=>q.eq('episodeId',args.episodeId).eq('undone',!undo)).order(undo?'desc':'asc').first();
 if(!entry||entry._id!==args.entryId||entry.workspaceId!==space._id)throw Error('History changed. Try again with the latest edit.');
 const expected=JSON.parse(undo?entry.after:entry.before),target=JSON.parse(undo?entry.before:entry.after);
 if(entry.kind==='segment'){
  const original=JSON.parse(entry.before)??JSON.parse(entry.after);
  const current=await ctx.db.get(original._id as Id<'segments'>);
  const visible=current&&!current.historyHidden?current:null;
  // Internal grouping may be backfilled after the history snapshot was saved.
  const clean=(doc:any)=>{if(!doc)return null;const {historyHidden,accountType,workspaceId,...rest}=doc;return rest;};
  if(canonical(clean(visible))!==canonical(clean(expected)))throw Error('This segment changed elsewhere. Nothing was overwritten.');
  if(!current||current.episodeId!==args.episodeId)throw Error('This segment is no longer available.');
  if(!target)await ctx.db.patch(current._id,{historyHidden:true});
  else {const {_id,_creationTime,historyHidden,accountType,workspaceId,...fields}=target;const grouping=await segmentAccountFields(ctx,await ctx.db.get(current.episodeId));await ctx.db.replace(current._id,{...fields,...grouping,historyHidden:false});}
 }else{
  const row=await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
  const visibility=await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
  if(canonical({boxes:row?.boxes??[],spans:visibility?.spans??null})!==canonical(expected))throw Error('These outlines or visibility records changed elsewhere. Nothing was overwritten.');
  if(row)await ctx.db.patch(row._id,{boxes:target.boxes});else await ctx.db.insert('objectBoxes',{episodeId:args.episodeId,boxes:target.boxes});
  if(target.spans!==null){if(visibility)await ctx.db.patch(visibility._id,{spans:target.spans});else await ctx.db.insert('objectVisibility',{episodeId:args.episodeId,spans:target.spans});}
 }
 await ctx.db.patch(entry._id,{undone:undo});return null;
}});
