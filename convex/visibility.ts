import {v} from 'convex/values';
import {query,mutation} from './_generated/server';
import {ownedEpisode} from './access';
export const visibilityValue=v.object({id:v.string(),objectId:v.string(),start:v.number(),end:v.number(),state:v.union(v.literal('absent'),v.literal('needs_checking')),reappearanceBoxId:v.optional(v.string())});
export const list=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(visibilityValue),handler:async(ctx,a)=>{await ownedEpisode(ctx,a.workspaceToken,a.episodeId);return (await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique())?.spans??[];}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),span:visibilityValue},returns:v.null(),handler:async(ctx,a)=>{
 const ep=await ownedEpisode(ctx,a.workspaceToken,a.episodeId),s=a.span;
 if(!s.id||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>ep.duration)throw new Error('Choose a start and later end inside this video.');
 if(!await ctx.db.query('objects').withIndex('by_episode_object',q=>q.eq('episodeId',a.episodeId).eq('objectId',s.objectId)).unique())throw new Error('Choose a saved object from this video.');
 const row=await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique(),spans=row?.spans??[];
 if(spans.some(p=>p.id!==s.id&&p.objectId===s.objectId&&p.start<s.end&&p.end>s.start))throw new Error('This overlaps another visibility span for this object.');
 if(spans.length>=2000&&!spans.some(p=>p.id===s.id))throw new Error('Visibility span limit reached.');
 if(s.reappearanceBoxId){const shapes=(await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique())?.boxes??[];const b=shapes.find(b=>b.id===s.reappearanceBoxId);if(!b||b.objectId!==s.objectId||Math.abs(b.time-s.end)>.0005||b.reviewStatus!=='verified')throw new Error('Verify a saved outline of the same object at the span end first.');}
 const next=[...spans.filter(p=>p.id!==s.id),s].sort((a,b)=>a.start-b.start);if(row)await ctx.db.patch(row._id,{spans:next});else await ctx.db.insert('objectVisibility',{episodeId:a.episodeId,spans:next});return null;
}});
export const remove=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),id:v.string()},returns:v.null(),handler:async(ctx,a)=>{await ownedEpisode(ctx,a.workspaceToken,a.episodeId);const row=await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique();if(row)await ctx.db.patch(row._id,{spans:row.spans.filter(s=>s.id!==a.id)});return null;}});
