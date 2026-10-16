import {expect,test} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');

test('trial attribution links existing labels without claiming or changing trial work',async()=>{
 const t=convexTest(schema,modules),workspaceToken='a'.repeat(64);
 const {userId,workspaceId,episodeId,segmentId}=await t.run(async ctx=>{
  const userId=await ctx.db.insert('users',{name:'Trial user'});
  const workspaceId=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial',accountType:'anonymous'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Trial',duration:30});
  const segmentId=await ctx.db.insert('segments',{workspaceId,episodeId,label:'Pick up',start_sec:1,end_sec:3,accountType:'anonymous'});
  return {userId,workspaceId,episodeId,segmentId};
 });
 await expect(t.mutation(api.accounts.linkTrial,{workspaceToken})).rejects.toThrow('Sign in');
 const signed=t.withIdentity({subject:`${userId}|session`});
 expect(await signed.mutation(api.accounts.linkTrial,{workspaceToken})).toBe(true);
 expect(await signed.mutation(api.accounts.linkTrial,{workspaceToken})).toBe(true);
 await t.run(async ctx=>{
  expect(await ctx.db.query('trialAccountLinks').withIndex('by_user',q=>q.eq('userId',userId)).collect()).toMatchObject([{workspaceId,userId,source:'same_browser'}]);
  expect((await ctx.db.get(workspaceId))?.userId).toBeUndefined();
  expect(await ctx.db.get(segmentId)).toMatchObject({label:'Pick up',accountType:'anonymous'});
 });
 expect(await t.query(api.annotations.segments,{workspaceToken,episodeId})).toHaveLength(1);
 const otherId=await t.run(ctx=>ctx.db.insert('users',{name:'Other person'}));
 expect(await t.withIdentity({subject:`${otherId}|session`}).mutation(api.accounts.linkTrial,{workspaceToken})).toBe(false);
});

test('personal and missing workspace tokens cannot be recorded as trial use',async()=>{
 const t=convexTest(schema,modules);
 const userId=await t.run(async ctx=>{await ctx.db.insert('workspaces',{token:'b'.repeat(64),kind:'personal'});return ctx.db.insert('users',{name:'User'});});
 const signed=t.withIdentity({subject:`${userId}|session`});
 expect(await signed.mutation(api.accounts.linkTrial,{workspaceToken:'b'.repeat(64)})).toBe(false);
 expect(await signed.mutation(api.accounts.linkTrial,{workspaceToken:'c'.repeat(64)})).toBe(false);
 await expect(signed.mutation(api.accounts.linkTrial,{workspaceToken:'invalid'})).rejects.toThrow('Invalid');
 expect(await t.run(ctx=>ctx.db.query('trialAccountLinks').collect())).toEqual([]);
});
