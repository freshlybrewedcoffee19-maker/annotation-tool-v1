import type {QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {getAuthUserId} from '@convex-dev/auth/server';
import {episodeProject,projectRole,activeEpisode,editLease} from './projectAccess';
import type {MutationCtx} from './_generated/server';
export async function workspace(ctx:QueryCtx,token:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Private workspace unavailable.');
 const saved=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!saved)throw new Error('Private workspace unavailable.');
 if(saved.userId&&saved.userId!==await getAuthUserId(ctx))throw new Error('Sign in to open your saved workspace.');
 return saved;
}
export async function ownedEpisode(ctx:QueryCtx,token:string,id:Id<'episodes'>,editing:boolean|'read'=false){
 const space=await workspace(ctx,token),episode=await ctx.db.get(id);
 if(!episode)throw new Error('Video not found in this workspace.');
 if(episode.workspaceId!==space._id){const projectId=await episodeProject(ctx,id);if(!projectId)throw Error('Video not found in this workspace.');await projectRole(ctx,projectId);}
 if(!await activeEpisode(ctx,id))throw Error('This video is in Trash. Restore it before opening.');
 if(editing!=='read'&&(editing||'patch' in ctx.db))await editLease(ctx as MutationCtx,id);return episode;
}
