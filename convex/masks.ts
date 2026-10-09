import {v} from 'convex/values';
import {query,mutation} from './_generated/server';
import {ownedEpisode} from './access';
import {requireProjectPermission} from './projectAccess';
export const maskFields={episodeId:v.id('episodes'),objectId:v.string(),time:v.number(),width:v.number(),height:v.number(),runs:v.optional(v.array(v.number())),status:v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified')),revision:v.number()};
const {runs:runValidator,...summaryFields}=maskFields;
const summary=v.object({...summaryFields,_id:v.id('pixelMasks'),_creationTime:v.number()});
const document=v.object({...maskFields,runs:v.array(v.number()),_id:v.id('pixelMasks'),_creationTime:v.number()});
export function validateMask(width:number,height:number,runs:number[]){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>2000000||runs.length<2||runs.length>60000||runs.some((n,i)=>!Number.isSafeInteger(n)||n<0||(i>0&&n===0))||runs.reduce((a,b)=>a+b,0)!==width*height||!runs.some((n,i)=>i%2===1&&n>0))throw Error('Paint a nonempty mask inside the frame. Use a simpler outline if it is too detailed.');
}
export const list=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(summary),handler:async(ctx,a)=>{await ownedEpisode(ctx,a.workspaceToken,a.episodeId);return (await ctx.db.query('pixelMasks').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(501)).map(({runs,...row})=>row);}});
export const get=query({args:{workspaceToken:v.string(),id:v.id('pixelMasks')},returns:document,handler:async(ctx,a)=>{const row=await ctx.db.get(a.id);if(!row)throw Error('Mask no longer exists.');await ownedEpisode(ctx,a.workspaceToken,row.episodeId);const data=await ctx.db.query('maskPixels').withIndex('by_mask',q=>q.eq('maskId',row._id)).unique();return {...row,runs:data?.runs??row.runs??[]};}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),id:v.optional(v.id('pixelMasks')),revision:v.optional(v.number()),objectId:v.string(),time:v.number(),width:v.number(),height:v.number(),runs:v.array(v.number())},returns:v.id('pixelMasks'),handler:async(ctx,a)=>{
 const ep=await ownedEpisode(ctx,a.workspaceToken,a.episodeId);validateMask(a.width,a.height,a.runs);
 if(!Number.isFinite(a.time)||a.time<0||a.time>ep.duration)throw Error('Choose a frame inside the video.');
 const object=await ctx.db.query('objects').withIndex('by_episode_object',q=>q.eq('episodeId',a.episodeId).eq('objectId',a.objectId)).unique();if(!object)throw Error('Create an object outline first, then link its mask.');
 const old=a.id?await ctx.db.get(a.id):null;
 if(a.id&&(!old||old.episodeId!==a.episodeId||old.revision!==a.revision))throw Error('This mask changed elsewhere. Reopen the saved mask before editing.');
 if(old&&(old.time!==a.time||old.objectId!==a.objectId))throw Error('Keep the saved mask linked to its original object and frame.');
 const fields={episodeId:a.episodeId,objectId:a.objectId,time:a.time,width:a.width,height:a.height,runs:undefined,status:'pending' as const,revision:(old?.revision??0)+1};
 if(old){await ctx.db.patch(old._id,fields);const data=await ctx.db.query('maskPixels').withIndex('by_mask',q=>q.eq('maskId',old._id)).unique();if(data)await ctx.db.patch(data._id,{runs:a.runs});else await ctx.db.insert('maskPixels',{episodeId:a.episodeId,maskId:old._id,runs:a.runs});return old._id;}
 await requireProjectPermission(ctx,a.episodeId,'create');
 if((await ctx.db.query('pixelMasks').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(500)).length>=500)throw Error('This video has reached 500 saved masks.');
 const id=await ctx.db.insert('pixelMasks',fields);await ctx.db.insert('maskPixels',{episodeId:a.episodeId,maskId:id,runs:a.runs});return id;
}});
export const review=mutation({args:{workspaceToken:v.string(),id:v.id('pixelMasks'),revision:v.number(),status:maskFields.status},returns:v.null(),handler:async(ctx,a)=>{const row=await ctx.db.get(a.id);if(!row)throw Error('Mask no longer exists.');await ownedEpisode(ctx,a.workspaceToken,row.episodeId);if(row.revision!==a.revision)throw Error('This mask changed. Reopen it before review.');await ctx.db.patch(row._id,{status:a.status,revision:row.revision+1});return null;}});
