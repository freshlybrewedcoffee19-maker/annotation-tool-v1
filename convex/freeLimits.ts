import type {QueryCtx} from './_generated/server';
import type {Doc} from './_generated/dataModel';
export const FREE_STORAGE=1_000_000_000,FREE_VIDEO=250_000_000,FREE_PROJECTS=5;
export async function accountUsage(ctx:QueryCtx,space:Doc<'workspaces'>){
 const spaces=space.userId?await ctx.db.query('workspaces').withIndex('by_user',q=>q.eq('userId',space.userId)).take(101):[space];
 if(spaces.length>100)throw new Error('Account storage needs review before another upload.');
 let stored=0,reserved=0,projects=0;
 for(const workspace of spaces){
  const videos=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  const uploads=await ctx.db.query('r2Uploads').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  const groups=await ctx.db.query('projects').withIndex('by_workspace',q=>q.eq('workspaceId',workspace._id)).take(1001);
  if(videos.length>1000||uploads.length>1000||groups.length>1000)throw new Error('Account storage needs review before another upload.');
  for(const video of videos){stored+=video.fileSize??(video.storageId?(await ctx.db.system.get(video.storageId))?.size??0:0);}
  reserved+=uploads.filter(u=>!u.episodeId&&!u.cleanedAt).reduce((sum,u)=>sum+u.size,0);projects+=groups.length;
 }
 return {stored,reserved,projects};
}
export async function allowUpload(ctx:QueryCtx,space:Doc<'workspaces'>,size:number){
 if(size>FREE_VIDEO)throw new Error('Free plan: each video can be up to 250 MB.');
 const usage=await accountUsage(ctx,space);
 if(usage.stored+usage.reserved+size>FREE_STORAGE)throw new Error('Free plan storage limit reached (1 GB). Saved work is still available. Unfinished uploads reserve space until they expire.');
 return usage;
}
