import {getAuthUserId} from '@convex-dev/auth/server';
import type {QueryCtx,MutationCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
export async function projectRole(ctx:QueryCtx,id:Id<'projects'>){
 const user=await getAuthUserId(ctx),project=await ctx.db.get(id);if(!user||!project)throw Error('Sign in to open this project.');
 const space=await ctx.db.get(project.workspaceId);if(space?.userId===user)return {project,user,role:'owner' as const};
 const member=await ctx.db.query('projectMembers').withIndex('by_project_user',q=>q.eq('projectId',id).eq('userId',user)).unique();if(!member)throw Error('This project has not been shared with you.');return {project,user,role:member.role};
}
export async function episodeProject(ctx:QueryCtx,id:Id<'episodes'>){return (await ctx.db.query('projectVideos').withIndex('by_episode',q=>q.eq('episodeId',id)).unique())?.projectId??null;}
export async function requireProjectPermission(ctx:QueryCtx,id:Id<'episodes'>,mode:'create'|'settings'){
 const projectId=await episodeProject(ctx,id);if(!projectId)return;const {role}=await projectRole(ctx,projectId);if(mode==='settings'&&role!=='owner')throw Error('Only the project owner can change its settings.');if(mode==='create'&&role==='reviewer')throw Error('Reviewers can check and correct saved annotations. Ask for Annotator access to add new ones.');
}
export async function visibleEpisodes(ctx:QueryCtx,spaceId:Id<'workspaces'>){
 const own=await ctx.db.query('episodes').withIndex('by_workspace',q=>q.eq('workspaceId',spaceId)).take(1000),user=await getAuthUserId(ctx);const all=new Map(own.map(e=>[e._id,e]));
 if(user&&(await ctx.db.get(spaceId))?.userId===user){const memberships=await ctx.db.query('projectMembers').withIndex('by_user',q=>q.eq('userId',user)).take(51);if(memberships.length>50)throw Error('Shared projects need review before opening.');for(const member of memberships){const project=await ctx.db.get(member.projectId);if(!project||project.deletedAt)continue;const links=await ctx.db.query('projectVideos').withIndex('by_project',q=>q.eq('projectId',project._id)).take(1000);for(const link of links){const ep=await ctx.db.get(link.episodeId);if(ep)all.set(ep._id,ep);}}}
 const result=[];for(const ep of all.values())if(!await ctx.db.query('v2Videos').withIndex('by_episode',q=>q.eq('episodeId',ep._id)).unique()&&await activeEpisode(ctx,ep._id))result.push(ep);return result;
}
export async function activeEpisode(ctx:QueryCtx,id:Id<'episodes'>){if(await ctx.db.query('videoTrash').withIndex('by_episode',q=>q.eq('episodeId',id)).unique())return false;const projectId=await episodeProject(ctx,id);return !projectId||!(await ctx.db.get(projectId))?.deletedAt;}
export async function editLease(ctx:MutationCtx,id:Id<'episodes'>){
 const projectId=await episodeProject(ctx,id);if(!projectId)return;const {user}=await projectRole(ctx,projectId);
 const row=await ctx.db.query('videoLeases').withIndex('by_episode',q=>q.eq('episodeId',id)).unique();if(row&&row.expiresAt>Date.now()&&row.userId!==user)throw Error('A teammate is editing this video. Wait until they finish.');
 if(row)await ctx.db.patch(row._id,{userId:user,expiresAt:Date.now()+60000});else await ctx.db.insert('videoLeases',{episodeId:id,userId:user,expiresAt:Date.now()+60000});
}
