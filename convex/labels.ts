import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
import {workspace,ownedEpisode} from './access';
export const list=query({args:{workspaceToken:v.string(),episodeId:v.optional(v.id("episodes"))},returns:v.array(v.string()),handler:async(ctx,{workspaceToken,episodeId})=>{
 const space=await workspace(ctx,workspaceToken);
 if(episodeId){const ep=await ownedEpisode(ctx,workspaceToken,episodeId);if(ep.labels)return ep.labels;}
 const saved=await ctx.db.query('labelLists').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 return saved?.labels??[];
}});
export const save=mutation({args:{workspaceToken:v.string(),text:v.string(),episodeId:v.optional(v.id("episodes"))},returns:v.array(v.string()),handler:async(ctx,{workspaceToken,text,episodeId})=>{
 const space=await workspace(ctx,workspaceToken);
 const labels=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(!labels.length || labels.length>100 || labels.some(s=>s.length>120))throw new Error('Enter 1 to 100 labels, each up to 120 characters.');
 if(episodeId){await ownedEpisode(ctx,workspaceToken,episodeId);await ctx.db.patch(episodeId,{labels});return labels;}
 const saved=await ctx.db.query('labelLists').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();
 if(saved)await ctx.db.patch(saved._id,{labels});else await ctx.db.insert('labelLists',{workspaceId:space._id,key:'shared',labels});
 return labels;
}});
