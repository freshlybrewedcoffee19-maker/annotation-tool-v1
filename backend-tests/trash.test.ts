import {test,expect,vi,afterEach} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
const removeFile=vi.hoisted(()=>vi.fn());
vi.mock('../convex/r2Client',()=>({r2Client:()=>({client:{send:removeFile},bucket:'test-only'})}));
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();removeFile.mockReset();});
async function fixture(){
 const t=convexTest(schema,modules),token='a'.repeat(64);
 const d=await t.run(async ctx=>{
  const user=await ctx.db.insert('users',{}),other=await ctx.db.insert('users',{});
  const workspaceId=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'});
  const projectId=await ctx.db.insert('projects',{workspaceId,name:'Keep my work',updatedAt:Date.now()});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Video.mp4',duration:60,fileSize:100,r2Key:'videos/trash-test'});
  await ctx.db.insert('projectVideos',{workspaceId,projectId,episodeId});
  const segmentId=await ctx.db.insert('segments',{episodeId,label:'Keep this label',start_sec:1,end_sec:2});
  return {user,other,workspaceId,projectId,episodeId,segmentId};
 });
 return {t,d,token,owner:t.withIdentity({subject:`${d.user}|session`}),other:t.withIdentity({subject:`${d.other}|session`})};
}
test('Trash hides videos, retains storage and annotations, and restores the same records',async()=>{
 const {t,d,token,owner,other}=await fixture(),args={workspaceToken:token,episodeId:d.episodeId};
 await expect(other.mutation(api.trash.moveVideo,args)).rejects.toThrow();
 await owner.mutation(api.trash.moveVideo,args);
 expect(await owner.query(api.annotations.episodes,{workspaceToken:token})).toEqual([]);
 expect((await owner.query(api.trash.list,{workspaceToken:token})).videos).toHaveLength(1);
 expect(await t.run(ctx=>ctx.db.get(d.segmentId))).toMatchObject({label:'Keep this label'});
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({stored:100});
 await expect(owner.mutation(api.annotations.save,{...args,label:'Forbidden',start_sec:3,end_sec:4})).rejects.toThrow('Trash');
 await owner.mutation(api.trash.restoreVideo,args);
 expect(await owner.query(api.annotations.episodes,{workspaceToken:token})).toMatchObject([{_id:d.episodeId}]);
 expect(await t.run(ctx=>ctx.db.get(d.segmentId))).toMatchObject({label:'Keep this label'});
});
test('restoring a project preserves previously trashed videos and sharing',async()=>{
 const {t,d,token,owner}=await fixture();
 const second=await t.run(async ctx=>{const id=await ctx.db.insert('episodes',{workspaceId:d.workspaceId,name:'Second.mp4',duration:60});await ctx.db.insert('projectVideos',{workspaceId:d.workspaceId,projectId:d.projectId,episodeId:id});await ctx.db.insert('projectMembers',{projectId:d.projectId,userId:d.other,role:'reviewer'});return id;});
 await owner.mutation(api.trash.moveVideo,{workspaceToken:token,episodeId:second});
 await owner.mutation(api.trash.moveProject,{workspaceToken:token,projectId:d.projectId});
 expect(await owner.query(api.projects.list,{workspaceToken:token})).toEqual([]);
 await expect(owner.mutation(api.trash.restoreVideo,{workspaceToken:token,episodeId:d.episodeId})).rejects.toThrow('project first');
 await owner.mutation(api.trash.restoreProject,{workspaceToken:token,projectId:d.projectId});
 expect(await owner.query(api.annotations.episodes,{workspaceToken:token})).toMatchObject([{_id:d.episodeId}]);
 expect(await t.run(ctx=>ctx.db.query('projectMembers').withIndex('by_project',q=>q.eq('projectId',d.projectId)).unique())).not.toBeNull();
 expect((await owner.query(api.trash.list,{workspaceToken:token})).videos).toMatchObject([{episodeId:second}]);
});
test('permanent cleanup waits seven days and storage removal before deleting dependent records',async()=>{
 vi.useFakeTimers();const {t,d,token,owner}=await fixture();
 await owner.mutation(api.trash.moveProject,{workspaceToken:token,projectId:d.projectId});
 expect(await t.mutation(internal.trash.claimExpired,{})).toEqual([]);
 vi.setSystemTime(Date.now()+7*86400000);
 await expect(owner.mutation(api.trash.restoreProject,{workspaceToken:token,projectId:d.projectId})).rejects.toThrow('expired');
 const [claim]=await t.mutation(internal.trash.claimExpired,{});
 expect(claim.keys).toContain('videos/trash-test');
 await expect(t.mutation(internal.trash.finishPurge,{id:claim.id})).rejects.toThrow('storage');
 await t.mutation(internal.trash.mediaRemoved,{id:claim.id});
 expect(await t.mutation(internal.trash.finishPurge,{id:claim.id})).toBe(true);
 expect(await t.run(ctx=>ctx.db.get(d.episodeId))).toBeNull();
 expect(await t.run(ctx=>ctx.db.get(d.segmentId))).toBeNull();
 await t.mutation(internal.trash.finishProjects,{});
 expect(await t.run(ctx=>ctx.db.get(d.projectId))).toBeNull();
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({stored:0,projects:0});
});
test('failed file removal retains records and storage totals, then cleanup retries successfully',async()=>{
 vi.useFakeTimers();const {t,d,token,owner}=await fixture();
 await owner.mutation(api.trash.moveVideo,{workspaceToken:token,episodeId:d.episodeId});
 vi.setSystemTime(Date.now()+7*86400000);
 removeFile.mockRejectedValueOnce(Error('Temporary storage failure'));
 vi.spyOn(console,'error').mockImplementation(()=>{});
 await t.action(internal.trashCleanup.expired,{});
 expect(await t.run(ctx=>ctx.db.get(d.episodeId))).not.toBeNull();
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({stored:100});
 removeFile.mockResolvedValue({});
 await t.action(internal.trashCleanup.expired,{});
 expect(await t.run(ctx=>ctx.db.get(d.episodeId))).toBeNull();
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({stored:0});
});
test('Trash frees an active project slot and restoring respects the five-project limit',async()=>{
 const {t,d,token,owner}=await fixture();
 await owner.mutation(api.trash.moveProject,{workspaceToken:token,projectId:d.projectId});
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({projects:0,stored:100});
 await t.run(async ctx=>{for(let i=0;i<5;i++)await ctx.db.insert('projects',{workspaceId:d.workspaceId,name:`Other ${i}`,updatedAt:Date.now()});});
 await expect(owner.mutation(api.trash.restoreProject,{workspaceToken:token,projectId:d.projectId})).rejects.toThrow('5 active projects');
 expect((await owner.query(api.trash.list,{workspaceToken:token})).projects).toHaveLength(1);
});
test('cleanup removes large annotation sets in batches and preserves another video sharing the file',async()=>{
 vi.useFakeTimers();const {t,d,token,owner}=await fixture();
 const kept=await t.run(async ctx=>{for(let i=0;i<205;i++)await ctx.db.insert('segments',{episodeId:d.episodeId,label:`Row ${i}`,start_sec:1,end_sec:2});return ctx.db.insert('episodes',{workspaceId:d.workspaceId,name:'Kept.mp4',r2Key:'videos/trash-test',duration:60});});
 await owner.mutation(api.trash.moveVideo,{workspaceToken:token,episodeId:d.episodeId});vi.setSystemTime(Date.now()+7*86400000);
 const [claim]=await t.mutation(internal.trash.claimExpired,{});expect(claim.keys).toEqual([]);
 await t.mutation(internal.trash.mediaRemoved,{id:claim.id});
 expect(await t.mutation(internal.trash.finishPurge,{id:claim.id})).toBe(false);
 expect(await t.mutation(internal.trash.finishPurge,{id:claim.id})).toBe(false);
 expect(await t.mutation(internal.trash.finishPurge,{id:claim.id})).toBe(true);
 expect(await t.run(ctx=>ctx.db.get(kept))).toMatchObject({r2Key:'videos/trash-test'});
});
