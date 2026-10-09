import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
async function fixture(){
 const t=convexTest(schema,modules);
 const d=await t.run(async ctx=>{
  const owner=await ctx.db.insert('users',{name:'Owner'}),reviewer=await ctx.db.insert('users',{name:'Reviewer'}),stranger=await ctx.db.insert('users',{name:'Stranger'});
  const ownerSpace=await ctx.db.insert('workspaces',{token:'a'.repeat(64),kind:'personal',userId:owner});
  await ctx.db.insert('workspaces',{token:'b'.repeat(64),kind:'personal',userId:reviewer});
  await ctx.db.insert('workspaces',{token:'c'.repeat(64),kind:'personal',userId:stranger});
  const episodeId=await ctx.db.insert('episodes',{workspaceId:ownerSpace,name:'Shared.mp4',duration:60});
  const projectId=await ctx.db.insert('projects',{workspaceId:ownerSpace,name:'Shared project',updatedAt:Date.now()});
  await ctx.db.insert('projectVideos',{workspaceId:ownerSpace,episodeId,projectId});
  const segmentId=await ctx.db.insert('segments',{episodeId,label:'Pick up',start_sec:1,end_sec:3});
  return {owner,reviewer,stranger,episodeId,projectId,segmentId};
 });
 const identity=(user:string)=>t.withIdentity({subject:`${user}|session`});
 return {t,d,owner:identity(d.owner),reviewer:identity(d.reviewer),stranger:identity(d.stranger)};
}
test('shared projects require a one-use invitation and enforce reviewer access and editing turns',async()=>{
 const {t,d,owner,reviewer,stranger}=await fixture();
 const ownerArgs={workspaceToken:'a'.repeat(64),episodeId:d.episodeId},reviewerArgs={workspaceToken:'b'.repeat(64),episodeId:d.episodeId};
 await expect(stranger.query(api.annotations.segments,{workspaceToken:'c'.repeat(64),episodeId:d.episodeId})).rejects.toThrow('not been shared');
 const token='d'.repeat(64);
 await owner.mutation(api.collaboration.invite,{projectId:d.projectId,role:'reviewer',token});
 expect(await reviewer.mutation(api.collaboration.accept,{token})).toBe(d.projectId);
 await expect(stranger.mutation(api.collaboration.accept,{token})).rejects.toThrow('already been used');
 expect(await reviewer.query(api.projects.list,{workspaceToken:reviewerArgs.workspaceToken})).toMatchObject([{id:d.projectId,owner:false}]);
 expect(await reviewer.query(api.annotations.episodes,{workspaceToken:reviewerArgs.workspaceToken})).toMatchObject([{_id:d.episodeId}]);
 await expect(reviewer.mutation(api.annotations.save,{...reviewerArgs,label:'New',start_sec:4,end_sec:5})).rejects.toThrow('Reviewers');
 await expect(reviewer.mutation(api.labels.save,{...reviewerArgs,text:'New label'})).rejects.toThrow('Only the project owner');
 await owner.mutation(api.collaboration.heartbeat,ownerArgs);
 expect(await reviewer.query(api.collaboration.lease,reviewerArgs)).toMatchObject({editable:false});
 await expect(reviewer.mutation(api.annotations.save,{...reviewerArgs,id:d.segmentId,label:'Corrected',start_sec:1,end_sec:4})).rejects.toThrow('teammate is editing');
 await owner.mutation(api.collaboration.release,{episodeId:d.episodeId});
 await reviewer.mutation(api.annotations.save,{...reviewerArgs,id:d.segmentId,label:'Corrected',start_sec:1,end_sec:4});
 const membership=await t.run(ctx=>ctx.db.query('projectMembers').withIndex('by_project',q=>q.eq('projectId',d.projectId)).unique());
 await owner.mutation(api.collaboration.remove,{id:membership!._id});
 await expect(reviewer.query(api.annotations.segments,reviewerArgs)).rejects.toThrow('not been shared');
});
test('saved progress includes metadata, stays private to each user, and rejects invalid positions',async()=>{
 const {d,owner,reviewer}=await fixture();
 const ownerArgs={workspaceToken:'a'.repeat(64),episodeId:d.episodeId},reviewerArgs={workspaceToken:'b'.repeat(64),episodeId:d.episodeId};
 const token='e'.repeat(64);
 await owner.mutation(api.collaboration.invite,{projectId:d.projectId,role:'annotator',token});
 await reviewer.mutation(api.collaboration.accept,{token});
 await owner.mutation(api.sessions.save,{...ownerArgs,position:12,activity:'objects',step:'metadata'});
 expect(await owner.query(api.sessions.load,ownerArgs)).toMatchObject({position:12,activity:'objects',step:'metadata'});
 expect(await reviewer.query(api.sessions.load,reviewerArgs)).toBeNull();
 await reviewer.mutation(api.sessions.save,{...reviewerArgs,position:24,activity:'review',step:'annotate'});
 expect(await owner.query(api.sessions.load,ownerArgs)).toMatchObject({position:12});
 await expect(owner.mutation(api.sessions.save,{...ownerArgs,position:61,activity:'objects',step:'annotate'})).rejects.toThrow('inside the video');
});
