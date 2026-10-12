import {internalQuery,internalMutation} from './_generated/server';
import {v} from 'convex/values';
import {allowUpload,allowSiteUpload,FREE_PROJECTS} from './freeLimits';
import {workspace,ownedEpisode} from './access';
import {getAuthUserId} from '@convex-dev/auth/server';
export const owner=internalQuery({args:{workspaceToken:v.string()},returns:v.id('workspaces'),handler:async(ctx,{workspaceToken})=>{
 const space=await workspace(ctx,workspaceToken);if(!space.userId||space.kind==='trial'||space.userId!==await getAuthUserId(ctx))throw new Error('Sign in to upload private videos.');return space._id;
}});
export const reserve=internalMutation({args:{workspaceToken:v.string(),key:v.string(),name:v.string(),size:v.number(),mime:v.string(),mediaType:v.optional(v.union(v.literal('image'),v.literal('video'))),version:v.optional(v.literal(2)),duration:v.number(),width:v.number(),height:v.number(),projectId:v.optional(v.id('projects'))},returns:v.id('r2Uploads'),handler:async(ctx,{workspaceToken,projectId,...fields})=>{
 const space=await workspace(ctx,workspaceToken);if(!space.userId||space.kind==='trial')throw new Error('Sign in to upload.');
 const image=fields.mediaType==='image';
 if(image&&fields.version===2)throw new Error('Image uploads are available in the main workspace.');
 if(!fields.name.trim()||fields.name.length>255||!Number.isInteger(fields.size)||fields.size<=0||fields.size>5e9||!(image?['image/jpeg','image/png','image/webp']:['video/mp4','video/webm','video/quicktime']).includes(fields.mime)||!Number.isFinite(fields.duration)||(image?fields.duration!==0:fields.duration<=0)||!Number.isInteger(fields.width)||!Number.isInteger(fields.height)||fields.width<=0||fields.height<=0)throw new Error('Choose a valid image or playable video under 5 GB.');
 await allowSiteUpload(ctx,fields.size);
 const usage=await allowUpload(ctx,space,fields.size);if(projectId){const project=await ctx.db.get(projectId);if(!project||project.workspaceId!==space._id||project.deletedAt!==undefined)throw new Error('Project not found.');}else if(usage.projects>=FREE_PROJECTS)throw new Error('Free plan: up to 5 projects. Add videos to an existing project.');
 return ctx.db.insert('r2Uploads',{...fields,workspaceId:space._id,createdAt:Date.now()});
}});
export const pending=internalQuery({args:{workspaceToken:v.string(),uploadId:v.id('r2Uploads')},returns:v.any(),handler:async(ctx,{workspaceToken,uploadId})=>{const space=await workspace(ctx,workspaceToken);const row=await ctx.db.get(uploadId);if(!row||row.workspaceId!==space._id)throw new Error('Upload not found.');return row;}});
export const finish=internalMutation({args:{workspaceToken:v.string(),uploadId:v.id('r2Uploads'),key:v.string()},returns:v.id('episodes'),handler:async(ctx,{workspaceToken,uploadId,key})=>{
 const space=await workspace(ctx,workspaceToken),row=await ctx.db.get(uploadId);if(!row||row.workspaceId!==space._id)throw new Error('Upload not found.');if(row.episodeId)return row.episodeId;
 const fields=await ctx.db.query('metadataFields').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();const defaults=await ctx.db.query('metadataDefaults').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();const labels=await ctx.db.query('labelLists').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).unique();const inherited=(defaults?.values??[]).filter(r=>r.locked&&fields?.fields.includes(r.field));
 const id=await ctx.db.insert('episodes',{workspaceId:space._id,r2Key:key,...(row.mediaType?{mediaType:row.mediaType}:{}),name:row.name,fileSize:row.size,mimeType:row.mime,duration:row.duration,width:row.width,height:row.height,labels:labels?.labels??[],metadata:inherited.map(({field,value})=>({field,value})),metadataLocks:inherited.map(r=>r.field)});await ctx.db.patch(uploadId,{episodeId:id});if(row.version===2)await ctx.db.insert('v2Videos',{workspaceId:space._id,episodeId:id,sample:false});return id;
}});
export const video=internalQuery({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.union(v.string(),v.null()),handler:async(ctx,{workspaceToken,episodeId})=>(await ownedEpisode(ctx,workspaceToken,episodeId)).r2Key??null});
export const stale=internalQuery({args:{},returns:v.array(v.object({id:v.id('r2Uploads'),key:v.string()})),handler:async(ctx)=>{
 const rows=await ctx.db.query('r2Uploads').withIndex('by_cleanup',q=>q.eq('cleanedAt',undefined).lt('createdAt',Date.now()-86400000)).take(50);return rows.map(r=>({id:r._id,key:r.key}));
}});
export const cleaned=internalMutation({args:{id:v.id('r2Uploads')},returns:v.null(),handler:async(ctx,{id})=>{await ctx.db.patch(id,{cleanedAt:Date.now()});return null;}});


