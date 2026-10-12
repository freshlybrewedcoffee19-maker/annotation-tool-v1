import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
import {ownedEpisode,workspace} from './access';
import {episodeProject,requireProjectPermission,visibleEpisodes} from './projectAccess';
import type {QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
const status=v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified'));
const row=v.object({_id:v.id('imageLabels'),_creationTime:v.number(),episodeId:v.id('episodes'),label:v.string(),normalizedLabel:v.string(),clientKey:v.string(),source:v.union(v.literal('manual'),v.literal('voice')),reviewStatus:status});
async function image(ctx:QueryCtx,workspaceToken:string,episodeId:Id<'episodes'>){const ep=await ownedEpisode(ctx,workspaceToken,episodeId);if(ep.mediaType!=='image')throw Error('Choose an image for image labels.');return ep;}
export const labels=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(row),handler:async(ctx,a)=>{await image(ctx,a.workspaceToken,a.episodeId);return ctx.db.query('imageLabels').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(1000);}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),id:v.optional(v.id('imageLabels')),label:v.string(),clientKey:v.string(),source:v.union(v.literal('manual'),v.literal('voice'))},returns:v.id('imageLabels'),handler:async(ctx,a)=>{
 await image(ctx,a.workspaceToken,a.episodeId);const label=a.label.trim(),normalizedLabel=label.normalize('NFKC').toLocaleLowerCase();
 if(!label||label.length>120||!a.clientKey||a.clientKey.length>100)throw Error('Use a label between 1 and 120 characters.');
 if(!a.id){await requireProjectPermission(ctx,a.episodeId,'create');const prior=await ctx.db.query('imageLabels').withIndex('by_episode_key',q=>q.eq('episodeId',a.episodeId).eq('clientKey',a.clientKey)).unique();if(prior)return prior._id;}
 const duplicate=await ctx.db.query('imageLabels').withIndex('by_episode_label',q=>q.eq('episodeId',a.episodeId).eq('normalizedLabel',normalizedLabel)).unique();
 if(duplicate&&duplicate._id!==a.id){if(a.id)throw Error('That label is already saved on this image.');return duplicate._id;}
 if(a.id){const old=await ctx.db.get(a.id);if(!old||old.episodeId!==a.episodeId)throw Error('Image label not found.');await ctx.db.patch(a.id,{label,normalizedLabel,reviewStatus:'pending'});return a.id;}
 const existing=await ctx.db.query('imageLabels').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(1000);if(existing.length>=1000)throw Error('This image has reached its label limit.');
 return ctx.db.insert('imageLabels',{episodeId:a.episodeId,label,normalizedLabel,clientKey:a.clientKey,source:a.source,reviewStatus:'pending'});
}});
export const remove=mutation({args:{workspaceToken:v.string(),id:v.id('imageLabels')},returns:v.null(),handler:async(ctx,a)=>{const old=await ctx.db.get(a.id);if(!old)throw Error('Image label not found.');await image(ctx,a.workspaceToken,old.episodeId);await ctx.db.delete(a.id);return null;}});
export const review=mutation({args:{workspaceToken:v.string(),id:v.id('imageLabels'),status},returns:v.null(),handler:async(ctx,a)=>{const old=await ctx.db.get(a.id);if(!old)throw Error('Image label not found.');await image(ctx,a.workspaceToken,old.episodeId);await ctx.db.patch(a.id,{reviewStatus:a.status});return null;}});
export const exportLabels=query({args:{workspaceToken:v.string(),episodeId:v.optional(v.id('episodes'))},returns:v.array(v.object({filename:v.string(),labels:v.array(v.string())})),handler:async(ctx,a)=>{
 const space=await workspace(ctx,a.workspaceToken);const files=a.episodeId?[await image(ctx,a.workspaceToken,a.episodeId)]:(await visibleEpisodes(ctx,space._id)).filter(e=>e.mediaType==='image');
 const result=[];for(const file of files){const labels=await ctx.db.query('imageLabels').withIndex('by_episode',q=>q.eq('episodeId',file._id)).take(1000);result.push({filename:file.name,labels:labels.filter(r=>r.reviewStatus!=='disqualified').map(r=>r.label)});}return result;
}});
export const siblings=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(v.id('episodes')),handler:async(ctx,a)=>{
 await ownedEpisode(ctx,a.workspaceToken,a.episodeId,'read');const project=await episodeProject(ctx,a.episodeId);if(!project)return [a.episodeId];
 const links=await ctx.db.query('projectVideos').withIndex('by_project',q=>q.eq('projectId',project)).take(1000);return links.map(r=>r.episodeId);
}});
