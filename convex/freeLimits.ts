import type {QueryCtx} from './_generated/server';
import type {Doc,Id} from './_generated/dataModel';
import {ConvexError} from 'convex/values';
export const FREE_STORAGE=1_000_000_000,FREE_VIDEO=250_000_000,FREE_PROJECTS=5;
export const UPLOAD_LIFETIME=86_400_000;
// Leave a grace period for already-running storage actions before scratch cleanup.
export const UPLOAD_CLEANUP_DELAY=UPLOAD_LIFETIME+3_600_000;
// Shared R2 allowance is across all users; reserve both staging and final copies.
export const SITE_STORAGE=6_000_000_000;

export async function marketingUsage(ctx:QueryCtx,ownerId:Id<'users'>){
 const rows=await ctx.db.query('marketingUploads').withIndex('by_owner',q=>q.eq('ownerId',ownerId)).take(2001);
 if(rows.length>2000)throw new Error('Account storage needs review before another upload.');
 let stored=0,reserved=0;
 for(const row of rows){
  if(row.completed){
   // Feedback audio stays available after finalisation. Video space is released
   // only after the existing cleanup flow confirms permanent-file deletion.
   if(!row.resultVersionId||(await ctx.db.get(row.resultVersionId))?.deletedAt===undefined)stored+=row.size;
  }else if(row.cancelledAt===undefined&&row.stagingCleanedAt===undefined)reserved+=row.size;
 }
 return {stored,reserved};
}

export async function allowSiteUpload(ctx:QueryCtx,size:number){
 const rows=await ctx.db.query('r2Uploads').withIndex('by_created').take(10001);
 const marketing=await ctx.db.query('marketingUploads').withIndex('by_created').take(10001);
 if(rows.length>10000||marketing.length>10000)throw new Error('New uploads are paused for a storage review. Saved work is still available.');
 let used=rows.reduce((sum,row)=>sum+(row.cleanedAt?(row.episodeId?row.size:0):row.size*2),0);
 for(const row of marketing){
  const retained=row.completed&&(!row.resultVersionId||(await ctx.db.get(row.resultVersionId))?.deletedAt===undefined);
  used+=row.stagingCleanedAt!==undefined?(retained?row.size:0):row.size*2;
 }
 if(used+size*2>SITE_STORAGE)throw new Error('Free storage is temporarily full across Cheddar Vox. New uploads are paused; your saved work is still available.');
}

async function annotationUsage(ctx:QueryCtx,spaces:Doc<'workspaces'>[]){
 if(spaces.length>100)throw new Error('Account storage needs review before another upload.');
 let stored=0,reserved=0,projects=0;
 for(const workspace of spaces){
  const videos=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  const uploads=await ctx.db.query('r2Uploads').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  const groups=await ctx.db.query('projects').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  if(videos.length>1000||uploads.length>1000||groups.length>1000)throw new Error('Account storage needs review before another upload.');
  for(const video of videos){stored+=video.fileSize??(video.storageId?(await ctx.db.system.get(video.storageId))?.size??0:0);}
  reserved+=uploads.filter(u=>!u.episodeId&&!u.cleanedAt).reduce((sum,u)=>sum+u.size,0);projects+=groups.filter(project=>project.deletedAt===undefined).length;
 }
 return {stored,reserved,projects};
}

export async function userUsage(ctx:QueryCtx,userId:Id<'users'>){
 const spaces=await ctx.db.query('workspaces').withIndex('by_user',q=>q.eq('userId',userId)).take(101);
 const annotation=await annotationUsage(ctx,spaces),marketing=await marketingUsage(ctx,userId);
 return {stored:annotation.stored+marketing.stored,reserved:annotation.reserved+marketing.reserved,projects:annotation.projects};
}

export async function accountUsage(ctx:QueryCtx,space:Doc<'workspaces'>){
 return space.userId?userUsage(ctx,space.userId):annotationUsage(ctx,[space]);
}

export function assertStorageAvailable(usage:{stored:number;reserved:number},size:number,owner=true){
 if(usage.stored+usage.reserved+size>FREE_STORAGE)throw new ConvexError({
  code:'STORAGE_LIMIT',storageLimit:FREE_STORAGE,storedBytes:usage.stored,reservedBytes:usage.reserved,requestedBytes:size,
  availableBytes:Math.max(0,FREE_STORAGE-usage.stored-usage.reserved),owner,
  message:'Free plan storage limit reached (1 GB). Additional storage requires a paid usage plan. Saved work is still available. Unfinished uploads reserve space until they are cancelled or cleaned up.',
 });
}

export async function allowUpload(ctx:QueryCtx,space:Doc<'workspaces'>,size:number){
 if(size>FREE_VIDEO)throw new Error('Free plan: each video can be up to 250 MB.');
 const usage=await accountUsage(ctx,space);
 assertStorageAvailable(usage,size);
 return usage;
}
