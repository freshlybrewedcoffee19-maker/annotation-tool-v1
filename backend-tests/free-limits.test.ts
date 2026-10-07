import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
test('free storage and video limits include reservations across account workspaces and preserve saved work',async()=>{
 const t=convexTest(schema,modules),token='d'.repeat(64),second='e'.repeat(64);
 const ids=await t.run(async ctx=>{const user=await ctx.db.insert('users',{});const one=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'}),two=await ctx.db.insert('workspaces',{userId:user,token:second,kind:'personal'});const episodeId=await ctx.db.insert('episodes',{workspaceId:two,r2Key:'videos/old',name:'Existing.mp4',duration:45,fileSize:750_000_000});return {user,episodeId};});const owner=t.withIdentity({subject:`${ids.user}|test`});
 const args={workspaceToken:token,key:'staging/test',name:'Robot.mp4',size:250_000_000,mime:'video/mp4',duration:45,width:640,height:480};
 await expect(owner.mutation(internal.r2Records.reserve,{...args,size:250_000_001})).rejects.toThrow('250 MB');
 const uploadId=await owner.mutation(internal.r2Records.reserve,args);
 expect(await owner.query(api.usage.limits,{workspaceToken:token})).toMatchObject({stored:750_000_000,reserved:250_000_000,storageLimit:1_000_000_000,cloudAI:false});
 await expect(owner.mutation(internal.r2Records.reserve,{...args,workspaceToken:second,size:1})).rejects.toThrow('storage limit');
 await t.mutation(internal.r2Records.cleaned,{id:uploadId});await owner.mutation(internal.r2Records.reserve,{...args,size:1});
 expect((await owner.query(api.annotations.episodes,{workspaceToken:second}))[0]._id).toBe(ids.episodeId);
 await t.run(ctx=>ctx.db.patch(ids.episodeId,{fileSize:1_100_000_000}));
 await expect(owner.mutation(internal.r2Records.reserve,{...args,size:1})).rejects.toThrow('storage limit');
 expect(await owner.query(internal.r2Records.video,{workspaceToken:second,episodeId:ids.episodeId})).toBe('videos/old');
});
test('five projects blocks new groups and uploads but permits adding to existing projects',async()=>{
 const t=convexTest(schema,modules),token='f'.repeat(64);const ids=await t.run(async ctx=>{const user=await ctx.db.insert('users',{}),space=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'});const projects=[];for(let i=0;i<5;i++)projects.push(await ctx.db.insert('projects',{workspaceId:space,name:`Project ${i}`,updatedAt:Date.now()}));const ep=await ctx.db.insert('episodes',{workspaceId:space,r2Key:'videos/test',name:'Robot.mp4',duration:45,fileSize:100});return {user,projects,ep};});const owner=t.withIdentity({subject:`${ids.user}|test`});
 await expect(owner.mutation(api.projects.addVideos,{workspaceToken:token,name:'Sixth',episodeIds:[ids.ep]})).rejects.toThrow('5 projects');
 const args={workspaceToken:token,key:'staging/test',name:'Robot.mp4',size:100,mime:'video/mp4',duration:45,width:640,height:480};await expect(owner.mutation(internal.r2Records.reserve,args)).rejects.toThrow('5 projects');
 await owner.mutation(internal.r2Records.reserve,{...args,projectId:ids.projects[0]});await owner.mutation(api.projects.addVideos,{workspaceToken:token,projectId:ids.projects[0],name:'Existing',episodeIds:[ids.ep]});expect(await owner.query(api.projects.list,{workspaceToken:token})).toHaveLength(5);
});
