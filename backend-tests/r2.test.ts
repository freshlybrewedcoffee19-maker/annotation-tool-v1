import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {internal,api} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
test('private R2 records reject other accounts and finalization preserves labels and is idempotent',async()=>{
 const t=convexTest(schema,modules),token='c'.repeat(64);const ids=await t.run(async ctx=>{const user=await ctx.db.insert('users',{}),other=await ctx.db.insert('users',{});const space=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'});await ctx.db.insert('labelLists',{workspaceId:space,key:'shared',labels:['grasp']});return {user,other};});const owner=t.withIdentity({subject:`${ids.user}|test`}),other=t.withIdentity({subject:`${ids.other}|test`});
 await expect(t.query(internal.r2Records.owner,{workspaceToken:token})).rejects.toThrow('Sign in');await expect(other.query(internal.r2Records.owner,{workspaceToken:token})).rejects.toThrow('Sign in');
 const uploadId=await owner.mutation(internal.r2Records.reserve,{workspaceToken:token,key:'staging/test',name:'Robot.mp4',size:100,mime:'video/mp4',duration:45,width:640,height:480});await expect(other.query(internal.r2Records.pending,{workspaceToken:token,uploadId})).rejects.toThrow('Sign in');
 const id=await owner.mutation(internal.r2Records.finish,{workspaceToken:token,uploadId,key:'videos/test'});expect(await owner.mutation(internal.r2Records.finish,{workspaceToken:token,uploadId,key:'videos/different'})).toBe(id);expect(await owner.query(internal.r2Records.video,{workspaceToken:token,episodeId:id})).toBe('videos/test');await expect(other.query(internal.r2Records.video,{workspaceToken:token,episodeId:id})).rejects.toThrow('Sign in');
 expect((await owner.query(api.annotations.episodes,{workspaceToken:token}))[0]).toMatchObject({name:'Robot.mp4',labels:['grasp'],r2Key:'videos/test',fileSize:100,url:null});
 await expect(owner.mutation(internal.r2Records.reserve,{workspaceToken:token,key:'bad',name:'x',size:-1,mime:'text/html',duration:45,width:10,height:10})).rejects.toThrow('playable');
 expect(await t.query(internal.r2Records.stale,{})).toEqual([]);
 await t.run(ctx=>ctx.db.patch(uploadId,{createdAt:Date.now()-86400001}));
 expect(await t.query(internal.r2Records.stale,{})).toEqual([{id:uploadId,key:'staging/test'}]);
 await t.mutation(internal.r2Records.cleaned,{id:uploadId});expect(await t.query(internal.r2Records.stale,{})).toEqual([]);
 expect(await owner.query(internal.r2Records.video,{workspaceToken:token,episodeId:id})).toBe('videos/test');
});
