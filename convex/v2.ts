import {query,mutation} from './_generated/server';
import {v} from 'convex/values';
import {workspace,ownedEpisode} from './access';
import {shapeValue,shapeFields,shapeStatus} from './v2Values';
import type {QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';

async function video(ctx:QueryCtx,token:string,id:Id<'episodes'>){
 const ep=await ownedEpisode(ctx,token,id,'read');
 if(!await ctx.db.query('v2Videos').withIndex('by_episode',q=>q.eq('episodeId',id)).unique())throw Error('Open this video in Version 1.');
 return ep;
}
export const videos=query({args:{workspaceToken:v.string()},returns:v.array(v.object({id:v.id('episodes'),name:v.string(),duration:v.number(),width:v.number(),height:v.number(),sample:v.boolean(),private:v.boolean()})),handler:async(ctx,{workspaceToken})=>{
 const space=await workspace(ctx,workspaceToken),links=await ctx.db.query('v2Videos').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).take(201);
 if(links.length>200)throw Error('This workspace has more than 200 Version 2 videos.');
 const result=[];for(const link of links){const ep=await ctx.db.get(link.episodeId);if(ep)result.push({id:ep._id,name:ep.name,duration:ep.duration,width:ep.width??640,height:ep.height??360,sample:link.sample,private:!!ep.r2Key});}return result;
}});
export const sample=mutation({args:{workspaceToken:v.string()},returns:v.id('episodes'),handler:async(ctx,{workspaceToken})=>{
 const space=await workspace(ctx,workspaceToken),links=await ctx.db.query('v2Videos').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).take(201);
 const existing=links.find(l=>l.sample);if(existing)return existing.episodeId;if(links.length>=200)throw Error('Up to 200 videos in this workspace.');
 const dataset=await ctx.db.query('trialDatasets').withIndex('by_key',q=>q.eq('key','active')).unique();if(!dataset)throw Error('Sample unavailable. Try again later.');
 // Media is the public Pages sample; no copying of V1 work or media storage.
 const episodeId=await ctx.db.insert('episodes',{workspaceId:space._id,name:'V2 sample video',duration:dataset.duration,width:dataset.width,height:dataset.height,frameRate:dataset.frameRate,labels:dataset.labels});
 await ctx.db.insert('v2Videos',{workspaceId:space._id,episodeId,sample:true});return episodeId;
}});
export const shapes=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(v.object({_id:v.id('v2Shapes'),_creationTime:v.number(),...shapeFields})),handler:async(ctx,{workspaceToken,episodeId})=>{
 await video(ctx,workspaceToken,episodeId);const rows=await ctx.db.query('v2Shapes').withIndex('by_episode',q=>q.eq('episodeId',episodeId)).take(2001);if(rows.length>2000)throw Error('This video needs paginated annotation loading. Export or use another clip.');return rows;
}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),shape:shapeValue,revision:v.number()},returns:v.number(),handler:async(ctx,{workspaceToken,episodeId,shape,revision})=>{
 const ep=await video(ctx,workspaceToken,episodeId);await ownedEpisode(ctx,workspaceToken,episodeId);
 if(!shape.key||shape.key.length>100||!shape.label.trim()||shape.label.length>120||!Number.isFinite(shape.time)||shape.time<0||shape.time>ep.duration||shape.points.some(p=>!Number.isFinite(p)||p<0||p>1)||shape.points.length%2||shape.points.length>4000)throw Error('Use a label, a time inside the video and points inside the frame.');
 const count=shape.points.length;
 if((shape.kind==='box'&&(count!==4||shape.points[2]-shape.points[0]<.001||shape.points[3]-shape.points[1]<.001))||(shape.kind==='polygon'&&count<6)||(shape.kind==='keypoint'&&count!==2)||(shape.kind==='classification'&&count!==0)||(shape.kind==='brush'&&(count<2||!shape.brushSize||shape.brushSize<.001||shape.brushSize>.2)))throw Error('Complete the annotation before saving.');
 const old=await ctx.db.query('v2Shapes').withIndex('by_episode_key',q=>q.eq('episodeId',episodeId).eq('key',shape.key)).unique();
 // Retrying the same creation is safe; changed data still requires its current revision.
 if(old&&(revision===0||old.revision===revision+1&&old.status==='pending')&&old.kind===shape.kind&&old.label===shape.label.trim()&&old.time===shape.time&&old.brushSize===shape.brushSize&&JSON.stringify(old.points)===JSON.stringify(shape.points)&&!old.deleted)return old.revision;
 if((old?.revision??0)!==revision)throw Error('This annotation changed elsewhere. Reload its latest version before saving.');
 if(!old){const rows=await ctx.db.query('v2Shapes').withIndex('by_episode',q=>q.eq('episodeId',episodeId)).take(2000);if(rows.length>=2000)throw Error('This video has reached 2,000 saved annotations.');}
 const next=revision+1,fields={...shape,label:shape.label.trim(),revision:next,status:'pending' as const,deleted:false,updatedAt:Date.now()};
 if(old)await ctx.db.patch(old._id,fields);else await ctx.db.insert('v2Shapes',{episodeId,...fields});return next;
}});
export const decide=mutation({args:{workspaceToken:v.string(),id:v.id('v2Shapes'),revision:v.number(),status:shapeStatus,deleted:v.optional(v.boolean())},returns:v.number(),handler:async(ctx,{workspaceToken,id,revision,...changes})=>{
 const row=await ctx.db.get(id);if(!row)throw Error('Annotation not found.');await video(ctx,workspaceToken,row.episodeId);await ownedEpisode(ctx,workspaceToken,row.episodeId);
 if(row.revision!==revision)throw Error('This annotation changed elsewhere. Reload before deciding.');
 await ctx.db.patch(id,{...changes,revision:revision+1,updatedAt:Date.now()});return revision+1;
}});
