import {query,mutation,internalMutation} from './_generated/server';
import type {QueryCtx,MutationCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {workspace} from './access';
import {accountUsage,FREE_PROJECTS} from './freeLimits';
const WEEK=7*86400000;
async function account(ctx:QueryCtx,token:string){
 const space=await workspace(ctx,token);
 if(!space.userId||space.kind==='trial'||space.userId!==await getAuthUserId(ctx))throw Error('Sign in to manage your Trash.');
 return space;
}
async function ownedProject(ctx:QueryCtx,token:string,id:Id<'projects'>){
 const space=await account(ctx,token),project=await ctx.db.get(id);
 if(!project||project.workspaceId!==space._id)throw Error('Only the project owner can manage Trash.');
 return project;
}
async function ownedVideo(ctx:QueryCtx,token:string,id:Id<'episodes'>){
 const space=await account(ctx,token),episode=await ctx.db.get(id);
 if(!episode||episode.workspaceId!==space._id)throw Error('Only the video owner can manage Trash.');
 return episode;
}
async function putVideo(ctx:MutationCtx,id:Id<'episodes'>,projectDeletionAt?:number){
 const old=await ctx.db.query('videoTrash').withIndex('by_episode',q=>q.eq('episodeId',id)).unique();
 if(old)return;
 const episode=await ctx.db.get(id);if(!episode?.workspaceId)throw Error('Video unavailable.');
 const link=await ctx.db.query('projectVideos').withIndex('by_episode',q=>q.eq('episodeId',id)).unique();
 const deletedAt=projectDeletionAt??Date.now();
 await ctx.db.insert('videoTrash',{episodeId:id,workspaceId:episode.workspaceId,sourceProject:link?.projectId,deletedAt,purgeAfter:deletedAt+WEEK,projectDeletionAt});
}
export const moveVideo=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.null(),handler:async(ctx,a)=>{
 await ownedVideo(ctx,a.workspaceToken,a.episodeId);await putVideo(ctx,a.episodeId);return null;
}});
export const moveProject=mutation({args:{workspaceToken:v.string(),projectId:v.id('projects')},returns:v.null(),handler:async(ctx,a)=>{
 const project=await ownedProject(ctx,a.workspaceToken,a.projectId);if(project.deletedAt!==undefined)return null;
 const links=await ctx.db.query('projectVideos').withIndex('by_project',q=>q.eq('projectId',a.projectId)).take(1001);
 if(links.length>1000)throw Error('This project needs a larger cleanup before moving to Trash.');
 const deletedAt=Date.now();for(const link of links)await putVideo(ctx,link.episodeId,deletedAt);
 await ctx.db.patch(project._id,{deletedAt,purgeAfter:deletedAt+WEEK});return null;
}});
export const restoreVideo=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.null(),handler:async(ctx,a)=>{
 await ownedVideo(ctx,a.workspaceToken,a.episodeId);
 const row=await ctx.db.query('videoTrash').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique();if(!row)return null;
 if(row.purgeAfter<=Date.now()||row.purgeStartedAt!==undefined)throw Error('The seven-day restore window has expired.');
 if(row.sourceProject&&(await ctx.db.get(row.sourceProject))?.deletedAt!==undefined)throw Error('Restore the project first.');
 await ctx.db.delete(row._id);return null;
}});
export const restoreProject=mutation({args:{workspaceToken:v.string(),projectId:v.id('projects')},returns:v.null(),handler:async(ctx,a)=>{
 const project=await ownedProject(ctx,a.workspaceToken,a.projectId);if(project.deletedAt===undefined)return null;
 if((project.purgeAfter??project.deletedAt+WEEK)<=Date.now())throw Error('The seven-day restore window has expired.');
 const space=await account(ctx,a.workspaceToken);if((await accountUsage(ctx,space)).projects>=FREE_PROJECTS)throw Error('Free plan: up to 5 active projects. Move another project to Trash before restoring this one.');
 const rows=await ctx.db.query('videoTrash').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).take(1001);
 if(rows.length>1000)throw Error('Trash needs review before restoring this project.');
 for(const row of rows)if(row.sourceProject===project._id&&row.projectDeletionAt===project.deletedAt){if(row.purgeStartedAt!==undefined)throw Error('This project is already being removed.');await ctx.db.delete(row._id);}
 await ctx.db.patch(project._id,{deletedAt:undefined,purgeAfter:undefined,updatedAt:Date.now()});return null;
}});
export const list=query({args:{workspaceToken:v.string()},returns:v.object({projects:v.array(v.object({projectId:v.id('projects'),name:v.string(),purgeAfter:v.number()})),videos:v.array(v.object({episodeId:v.id('episodes'),name:v.string(),projectName:v.union(v.string(),v.null()),purgeAfter:v.number()}))}),handler:async(ctx,{workspaceToken})=>{
 const space=await account(ctx,workspaceToken);
 const projects=await ctx.db.query('projects').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).take(1001),rows=await ctx.db.query('videoTrash').withIndex('by_workspace',q=>q.eq('workspaceId',space._id)).take(1001);
 if(projects.length>1000||rows.length>1000)throw Error('Trash needs review before opening.');
 const videos=[];for(const row of rows){const project=row.sourceProject?await ctx.db.get(row.sourceProject):null;if(project?.deletedAt!==undefined)continue;const ep=await ctx.db.get(row.episodeId);if(ep)videos.push({episodeId:ep._id,name:ep.name,projectName:project?.name??null,purgeAfter:row.purgeAfter});}
 return {projects:projects.filter(p=>p.deletedAt!==undefined).map(p=>({projectId:p._id,name:p.name,purgeAfter:p.purgeAfter??p.deletedAt!+WEEK})),videos};
}});
// Claim only expired items. Restore and cleanup cannot both win the same transaction.
export const claimExpired=internalMutation({args:{},returns:v.array(v.object({id:v.id('videoTrash'),keys:v.array(v.string()),storageId:v.union(v.id('_storage'),v.null())})),handler:async ctx=>{
 const rows=await ctx.db.query('videoTrash').withIndex('by_expiry',q=>q.lte('purgeAfter',Date.now())).take(10),result=[];
 for(const row of rows){
  const ep=await ctx.db.get(row.episodeId);if(ep&&ep.workspaceId!==row.workspaceId)throw Error('Trash ownership mismatch.');
  const keys=[];let storageId:Id<'_storage'>|null=null;
  if(ep?.r2Key){const refs=await ctx.db.query('episodes').withIndex('by_r2',q=>q.eq('r2Key',ep.r2Key)).take(2);if(refs.length===1)keys.push(ep.r2Key);}
  if(ep?.storageId){const refs=await ctx.db.query('episodes').withIndex('by_storage',q=>q.eq('storageId',ep.storageId)).take(2);if(refs.length===1)storageId=ep.storageId;}
  const uploads=await ctx.db.query('r2Uploads').withIndex('by_episode',q=>q.eq('episodeId',row.episodeId)).take(101);if(uploads.length>100)throw Error('Upload records need review before cleanup.');
  for(const upload of uploads){if(!upload.key.startsWith('staging/'))throw Error('Invalid temporary media path.');keys.push(upload.key);}
  if(keys.some(key=>!key.startsWith('videos/')&&!key.startsWith('staging/')))throw Error('Invalid media path.');
  await ctx.db.patch(row._id,{purgeStartedAt:row.purgeStartedAt??Date.now()});result.push({id:row._id,keys:[...new Set(keys)],storageId});
 }return result;
}});
export const mediaRemoved=internalMutation({args:{id:v.id('videoTrash')},returns:v.null(),handler:async(ctx,{id})=>{
 const row=await ctx.db.get(id);if(!row||row.purgeStartedAt===undefined||row.purgeAfter>Date.now())throw Error('Item is not ready for removal.');
 await ctx.db.patch(id,{mediaRemovedAt:Date.now()});return null;
}});
export const finishPurge=internalMutation({args:{id:v.id('videoTrash')},returns:v.boolean(),handler:async(ctx,{id})=>{
 const row=await ctx.db.get(id);if(!row)return true;if(row.mediaRemovedAt===undefined||row.purgeAfter>Date.now())throw Error('Remove expired media from storage before deleting its records.');
 let more=false;
 const history=await ctx.db.query('trialEditHistory').withIndex('by_episode_sequence',q=>q.eq('episodeId',row.episodeId)).take(100);
 for(const entry of history)await ctx.db.delete(entry._id);if(history.length===100)more=true;
 for(const table of ['segments','objects','objectBoxes','objectVisibility','trackSuggestions','setupDrafts','trialHistoryState','videoSessions','videoLeases','r2Uploads','projectVideos'] as const){
  const records=await ctx.db.query(table).withIndex('by_episode',q=>q.eq('episodeId',row.episodeId)).take(100);
  for(const record of records)await ctx.db.delete(record._id);if(records.length===100)more=true;
 }
 if(more)return false;
 const ep=await ctx.db.get(row.episodeId);
 if(ep?.storageId){const storageId=ep.storageId;const refs=await ctx.db.query('episodes').withIndex('by_storage',q=>q.eq('storageId',storageId)).take(2);if(refs.length===1){const owners=await ctx.db.query('fileOwners').withIndex('by_storage',q=>q.eq('storageId',storageId)).take(100);for(const owner of owners)await ctx.db.delete(owner._id);if(owners.length===100)return false;}}
 if(ep)await ctx.db.delete(ep._id);await ctx.db.delete(id);return true;
}});
export const removeStoredFile=internalMutation({args:{id:v.id('videoTrash'),storageId:v.id('_storage')},returns:v.null(),handler:async(ctx,a)=>{
 const row=await ctx.db.get(a.id),ep=row?await ctx.db.get(row.episodeId):null;
 if(!row||row.purgeStartedAt===undefined||row.purgeAfter>Date.now()||ep?.storageId!==a.storageId)throw Error('File is not ready for removal.');
 const refs=await ctx.db.query('episodes').withIndex('by_storage',q=>q.eq('storageId',a.storageId)).take(2);
 if(refs.length===1&&await ctx.db.system.get(a.storageId))await ctx.storage.delete(a.storageId);return null;
}});
export const finishProjects=internalMutation({args:{},returns:v.null(),handler:async ctx=>{
 const projects=await ctx.db.query('projects').withIndex('by_purge',q=>q.gt('purgeAfter',0).lte('purgeAfter',Date.now())).take(10);
 for(const project of projects){if(project.deletedAt===undefined)continue;if(await ctx.db.query('projectVideos').withIndex('by_project',q=>q.eq('projectId',project._id)).first())continue;
  let more=false;for(const table of ['projectMembers','projectInvites','projectSettings'] as const){const rows=await ctx.db.query(table).withIndex('by_project',q=>q.eq('projectId',project._id)).take(100);for(const row of rows)await ctx.db.delete(row._id);if(rows.length===100)more=true;}
  if(!more)await ctx.db.delete(project._id);
 }return null;
}});
