import {afterEach,expect,test,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
afterEach(()=>vi.useRealTimers());

test('new anonymous workspaces and voice labels are filterable without changing annotation data',async()=>{
 const t=convexTest(schema,modules),workspaceToken='a'.repeat(64);
 await t.mutation(api.workspaces.create,{workspaceToken});
 const {space,episodeId}=await t.run(async ctx=>{
  const space=await ctx.db.query('workspaces').withIndex('by_token',q=>q.eq('token',workspaceToken)).unique();
  return {space,episodeId:await ctx.db.insert('episodes',{workspaceId:space!._id,name:'Clip.mp4',duration:30})};
 });
 expect(space?.accountType).toBe('anonymous');
 const id=await t.mutation(api.annotations.save,{workspaceToken,episodeId,label:'Pick up',start_sec:2,end_sec:4,source:'voice'});
 expect(await t.query(api.annotations.segments,{workspaceToken,episodeId})).toMatchObject([{_id:id,workspaceId:space!._id,accountType:'anonymous',label:'Pick up',start_sec:2,end_sec:4,source:'voice'}]);
 expect(await t.query(api.annotations.exportAll,{workspaceToken})).toEqual([{episode:'Clip.mp4',label:'Pick up',start_sec:2,end_sec:4}]);
});

test('claiming a legacy workspace reclassifies every existing segment through bounded batches',async()=>{
 vi.useFakeTimers();const t=convexTest(schema,modules),workspaceToken='b'.repeat(64);
 const fixture=await t.run(async ctx=>{
  const userId=await ctx.db.insert('users',{name:'Owner'});
  const space=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'personal'});
  const ids=[];
  for(let e=0;e<51;e++){
   const episodeId=await ctx.db.insert('episodes',{workspaceId:space,name:`Clip ${e}`,duration:30});
   for(let i=0;i<(e===0?121:1);i++)ids.push(await ctx.db.insert('segments',{episodeId,label:`Label ${e}/${i}`,start_sec:1,end_sec:2,reviewStatus:'verified'}));
  }
  return {userId,space,ids};
 });
 const owner=t.withIdentity({subject:`${fixture.userId}|session`});
 await owner.mutation(api.accounts.claimWorkspace,{workspaceToken});
 await t.finishAllScheduledFunctions(()=>vi.runAllTimers());
 await t.run(async ctx=>{
  expect(await ctx.db.get(fixture.space)).toMatchObject({userId:fixture.userId,accountType:'registered'});
  const rows=await ctx.db.query('segments').withIndex('by_account_type',q=>q.eq('accountType','registered')).take(200);
  expect(rows).toHaveLength(171);
  for(const row of rows)expect(row).toMatchObject({workspaceId:fixture.space,accountType:'registered',start_sec:1,end_sec:2,reviewStatus:'verified'});
 });
});

test('registered owners and explicit test flags are preserved when saving labels',async()=>{
 const t=convexTest(schema,modules);
 const {userId,registered,testSpace,registeredEpisode,testEpisode}=await t.run(async ctx=>{
  const userId=await ctx.db.insert('users',{name:'Owner'});
  const registered=await ctx.db.insert('workspaces',{token:'c'.repeat(64),kind:'personal',userId});
  const testSpace=await ctx.db.insert('workspaces',{token:'d'.repeat(64),kind:'personal',accountType:'test'});
  return {userId,registered,testSpace,registeredEpisode:await ctx.db.insert('episodes',{workspaceId:registered,name:'One',duration:30}),testEpisode:await ctx.db.insert('episodes',{workspaceId:testSpace,name:'Two',duration:30})};
 });
 const owner=t.withIdentity({subject:`${userId}|session`});
 const id=await owner.mutation(api.annotations.save,{workspaceToken:'c'.repeat(64),episodeId:registeredEpisode,label:'A',start_sec:1,end_sec:2});
 const testId=await t.mutation(api.annotations.save,{workspaceToken:'d'.repeat(64),episodeId:testEpisode,label:'B',start_sec:1,end_sec:2});
 await t.run(async ctx=>{
  expect(await ctx.db.get(id)).toMatchObject({workspaceId:registered,accountType:'registered'});
  expect(await ctx.db.get(testId)).toMatchObject({workspaceId:testSpace,accountType:'test'});
 });
});

test('missing owner records stay unknown instead of being treated as anonymous',async()=>{
 vi.useFakeTimers();const t=convexTest(schema,modules);
 const {space,episodeId,id}=await t.run(async ctx=>{
  const deletedUser=await ctx.db.insert('users',{name:'Deleted account'});
  const space=await ctx.db.insert('workspaces',{token:'e'.repeat(64),kind:'personal',userId:deletedUser,accountType:'registered'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId:space,name:'Legacy',duration:30});
  const id=await ctx.db.insert('segments',{episodeId,label:'Keep',start_sec:1,end_sec:2});
  await ctx.db.delete(deletedUser);return {space,episodeId,id};
 });
 await t.mutation(internal.workspaces.refreshWorkspaceSegmentGroups,{workspaceId:space});
 await t.finishAllScheduledFunctions(()=>vi.runAllTimers());
 await t.run(async ctx=>{
  expect(await ctx.db.get(space)).toMatchObject({accountType:'unknown'});
  expect(await ctx.db.get(id)).toMatchObject({accountType:'unknown',workspaceId:space,episodeId,label:'Keep'});
 });
});

test('shared annotations use the video owner workspace and cannot set grouping from the browser',async()=>{
 const t=convexTest(schema,modules),workspaceToken='2'.repeat(64);
 const {authorId,ownerSpace,episodeId}=await t.run(async ctx=>{
  const ownerId=await ctx.db.insert('users',{name:'Owner'}),authorId=await ctx.db.insert('users',{name:'Teammate'});
  const ownerSpace=await ctx.db.insert('workspaces',{token:'1'.repeat(64),kind:'personal',userId:ownerId});
  await ctx.db.insert('workspaces',{token:workspaceToken,kind:'personal',userId:authorId});
  const episodeId=await ctx.db.insert('episodes',{workspaceId:ownerSpace,name:'Shared clip',duration:30});
  const projectId=await ctx.db.insert('projects',{workspaceId:ownerSpace,name:'Shared project',updatedAt:Date.now()});
  await ctx.db.insert('projectVideos',{projectId,episodeId,workspaceId:ownerSpace});
  await ctx.db.insert('projectMembers',{projectId,userId:authorId,role:'annotator'});
  return {authorId,ownerSpace,episodeId};
 });
 const author=t.withIdentity({subject:`${authorId}|session`});
 const args={workspaceToken,episodeId,label:'Carry',start_sec:1,end_sec:2};
 await expect(author.mutation(api.annotations.save,{...args,accountType:'test'} as never)).rejects.toThrow();
 const id=await author.mutation(api.annotations.save,args);
 await author.mutation(api.annotations.save,{...args,id,label:'Carry box',end_sec:3});
 expect(await author.query(api.annotations.segments,{workspaceToken,episodeId})).toMatchObject([{_id:id,workspaceId:ownerSpace,accountType:'registered',label:'Carry box',start_sec:1,end_sec:3}]);
 await expect(t.query(api.annotations.segments,{workspaceToken,episodeId})).rejects.toThrow('Sign in');
});

test('old trial undo and redo work after grouping is backfilled and keep the grouping fields',async()=>{
 const t=convexTest(schema,modules),workspaceToken='f'.repeat(64);
 const {space,episodeId,id,entryId}=await t.run(async ctx=>{
  const space=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId:space,name:'Trial',duration:30});
  const id=await ctx.db.insert('segments',{episodeId,label:'Wave',start_sec:1,end_sec:3,source:'voice'});
  const entryId=await ctx.db.insert('trialEditHistory',{workspaceId:space,episodeId,sequence:1,kind:'segment',description:'Add voice tag',before:'null',after:JSON.stringify(await ctx.db.get(id)),undone:false});
  return {space,episodeId,id,entryId};
 });
 await t.mutation(internal.workspaces.refreshEpisodeSegmentGroups,{episodeId});
 await t.mutation(api.trialHistory.apply,{workspaceToken,episodeId,entryId,direction:'undo'});
 expect(await t.query(api.annotations.segments,{workspaceToken,episodeId})).toEqual([]);
 await t.mutation(api.trialHistory.apply,{workspaceToken,episodeId,entryId,direction:'redo'});
 expect(await t.query(api.annotations.segments,{workspaceToken,episodeId})).toMatchObject([{_id:id,workspaceId:space,accountType:'anonymous',label:'Wave',start_sec:1,end_sec:3,source:'voice',historyHidden:false}]);
});
