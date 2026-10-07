import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {internal} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
test('shared storage ceiling counts temporary copies across accounts and preserves saved media',async()=>{
 const t=convexTest(schema,modules),token='1'.repeat(64);
 const ids=await t.run(async ctx=>{const user=await ctx.db.insert('users',{}),another=await ctx.db.insert('users',{}),space=await ctx.db.insert('workspaces',{userId:user,token,kind:'personal'}),otherSpace=await ctx.db.insert('workspaces',{userId:another,token:'2'.repeat(64),kind:'personal'});const ep=await ctx.db.insert('episodes',{workspaceId:otherSpace,r2Key:'videos/keep',name:'Old.mp4',duration:45});await ctx.db.insert('r2Uploads',{workspaceId:otherSpace,key:'staging/other',name:'Old.mp4',size:2_750_000_000,mime:'video/mp4',duration:45,width:640,height:480,createdAt:Date.now(),episodeId:ep});return {user,ep};});const owner=t.withIdentity({subject:`${ids.user}|test`});
 const args={workspaceToken:token,key:'staging/test',name:'Robot.mp4',size:250_000_000,mime:'video/mp4',duration:45,width:640,height:480};await owner.mutation(internal.r2Records.reserve,args);
 await expect(owner.mutation(internal.r2Records.reserve,{...args,size:1})).rejects.toThrow('across Cheddar Vox');expect(await t.run(ctx=>ctx.db.get(ids.ep))).toMatchObject({r2Key:'videos/keep'});
});
