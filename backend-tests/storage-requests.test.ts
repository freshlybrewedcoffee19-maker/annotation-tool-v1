import {afterEach,test,expect,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
const modules=import.meta.glob('../convex/**/*.{ts,js}');
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});

async function fixture(){
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
 const t=convexTest(schema,modules);const ids=await t.run(async ctx=>{
  const user=await ctx.db.insert('users',{name:'A marketer',email:'marketer@example.invalid',phone:'+919999999999'}),stranger=await ctx.db.insert('users',{email:'other@example.invalid'});
  const space=await ctx.db.insert('workspaces',{userId:user,token:'9'.repeat(64),kind:'personal'});
  await ctx.db.insert('episodes',{workspaceId:space,name:'PRIVATE-VIDEO-NAME.mp4',duration:10,fileSize:900_000_000,r2Key:'videos/private-key'});
  return {user,stranger};
 });
 return {t,ids,owner:t.withIdentity({subject:`${ids.user}|test`}),stranger:t.withIdentity({subject:`${ids.stranger}|test`})};
}

test('requests are signed-in, derive identity and usage, and concurrent clicks create only one record',async()=>{
 const f=await fixture();
 await expect(f.t.mutation(api.storageRequests.request,{source:'marketing'})).rejects.toThrow('Sign in');
 await expect(f.owner.mutation(api.storageRequests.request,{source:'marketing',email:'spoof@example.invalid'} as never)).rejects.toThrow();
 await expect(f.owner.mutation(api.storageRequests.request,{source:'marketing',requestedBytes:-1})).rejects.toThrow('size');
 const [a,b]=await Promise.all([f.owner.mutation(api.storageRequests.request,{source:'marketing',requestedBytes:200_000_000}),f.owner.mutation(api.storageRequests.request,{source:'annotation',requestedBytes:100})]);
 expect(a.requestId).toBe(b.requestId);expect(a.status).toBe('queued');
 const row=await f.t.run(ctx=>ctx.db.get(a.requestId));
 expect(row).toMatchObject({userId:f.ids.user,name:'A marketer',email:'marketer@example.invalid',storedBytes:900_000_000,reservedBytes:0,storageLimit:1_000_000_000,rateUsdPerGbMonth:.02});
 await expect(f.stranger.query(api.storageRequests.status,{requestId:a.requestId})).rejects.toThrow('not found');
 expect((await f.owner.query(api.storageRequests.status,{requestId:a.requestId})).status).toBe('queued');
});

test('only the fixed owner inbox receives safe account fields, and sent means provider acceptance',async()=>{
 const f=await fixture();vi.stubEnv('RESEND_API_KEY','test-storage-mail-key');
 const send=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'provider-message'}),{status:200}));vi.stubGlobal('fetch',send);
 const request=await f.owner.mutation(api.storageRequests.request,{source:'marketing',requestedBytes:250_000_000});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 expect(send).toHaveBeenCalledTimes(1);
 const [url,options]=send.mock.calls[0],body=JSON.parse(options.body);
 expect(url).toBe('https://api.resend.com/emails');expect(body.to).toEqual(['riya.shah@cheddarvox.com']);expect(body.reply_to).toBe('marketer@example.invalid');
 for(const text of ['A marketer','marketer@example.invalid',f.ids.user,'900000000','250000000','$0.020'])expect(body.text).toContain(text);
 for(const text of ['PRIVATE-VIDEO-NAME','videos/private-key','9999999999','test-storage-mail-key'])expect(body.text).not.toContain(text);
 expect(options.headers['Idempotency-Key']).toBe(`storage-request/${request.requestId}`);
 expect(await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).toMatchObject({status:'sent',sentAt:Date.now(),retryAt:null});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 expect(send).toHaveBeenCalledTimes(1);
 expect((await f.owner.mutation(api.storageRequests.request,{source:'marketing'})).requestId).toBe(request.requestId);
});

test('missing email configuration keeps a failed durable request and a later click can retry it',async()=>{
 const f=await fixture();vi.stubEnv('RESEND_API_KEY','');const send=vi.fn();vi.stubGlobal('fetch',send);
 const request=await f.owner.mutation(api.storageRequests.request,{source:'annotation'});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 const failed=await f.owner.query(api.storageRequests.status,{requestId:request.requestId});
 expect(failed.status).toBe('failed');expect(failed.sentAt).toBeNull();expect(send).not.toHaveBeenCalled();
 expect((await f.owner.mutation(api.storageRequests.request,{source:'annotation'})).status).toBe('failed');
 vi.setSystemTime(failed.retryAt!+1);vi.stubEnv('RESEND_API_KEY','test-storage-mail-key');send.mockResolvedValue(new Response(JSON.stringify({id:'retried-message'}),{status:200}));
 const retry=await f.owner.mutation(api.storageRequests.request,{source:'annotation'});expect(retry).toMatchObject({requestId:request.requestId,status:'queued'});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 expect((await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).status).toBe('sent');
});

test('transient failures schedule a bounded retry, preserve the idempotency key and hide provider details',async()=>{
 const f=await fixture();vi.stubEnv('RESEND_API_KEY','test-storage-mail-key');
 const send=vi.fn().mockResolvedValueOnce(new Response('PRIVATE-PROVIDER-ERROR',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({id:'retry-accepted'}),{status:200}));vi.stubGlobal('fetch',send);
 const request=await f.owner.mutation(api.storageRequests.request,{source:'marketing'});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 const pending=await f.owner.query(api.storageRequests.status,{requestId:request.requestId});expect(pending.status).toBe('queued');expect(pending.sentAt).toBeNull();expect(JSON.stringify(pending)).not.toContain('PRIVATE');
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});expect(send).toHaveBeenCalledTimes(1);
 vi.setSystemTime(pending.retryAt!+1);await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
 expect(send).toHaveBeenCalledTimes(2);expect(send.mock.calls[0][1].headers['Idempotency-Key']).toBe(send.mock.calls[1][1].headers['Idempotency-Key']);
 expect((await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).status).toBe('sent');
});

test('delivery claims are exclusive and a lost worker can be reclaimed after its lease',async()=>{
 const f=await fixture(),request=await f.owner.mutation(api.storageRequests.request,{source:'marketing'});
 const claims=await Promise.all([f.t.mutation(internal.storageRequests.claim,{requestId:request.requestId}),f.t.mutation(internal.storageRequests.claim,{requestId:request.requestId})]);
 expect(claims.filter(Boolean)).toHaveLength(1);expect(claims.find(Boolean)?.attempt).toBe(1);
 expect(await f.t.mutation(internal.storageRequests.claim,{requestId:request.requestId})).toBeNull();
 vi.setSystemTime(Date.now()+120_001);
 expect(await f.t.mutation(internal.storageRequests.claim,{requestId:request.requestId})).toMatchObject({attempt:2});
 // A late first response cannot overwrite the later worker's state with failure.
 await f.t.mutation(internal.storageRequests.delivered,{requestId:request.requestId,attempt:1,result:{ok:false,failureCode:'temporary'}});
 expect((await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).status).toBe('sending');
 await f.t.mutation(internal.storageRequests.delivered,{requestId:request.requestId,attempt:2,result:{ok:true,providerId:'accepted-once'}});
 expect((await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).status).toBe('sent');
});

test('delivery retries stop after four attempts and repeated clicks cannot reset the daily allowance',async()=>{
 const f=await fixture();vi.stubEnv('RESEND_API_KEY','test-storage-mail-key');
 const send=vi.fn(async()=>new Response('temporary failure',{status:503}));vi.stubGlobal('fetch',send);
 const request=await f.owner.mutation(api.storageRequests.request,{source:'marketing'});
 for(let attempt=0;attempt<4;attempt++){
  await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});
  const status=await f.owner.query(api.storageRequests.status,{requestId:request.requestId});
  expect(status.status).toBe(attempt===3?'failed':'queued');
  if(attempt<3)vi.setSystemTime(status.retryAt!+1);
 }
 expect(send).toHaveBeenCalledTimes(4);
 expect(await f.owner.mutation(api.storageRequests.request,{source:'annotation'})).toMatchObject({requestId:request.requestId,status:'failed'});
 await f.t.action(internal.storageRequests.deliver,{requestId:request.requestId});expect(send).toHaveBeenCalledTimes(4);
});

test('a saved request schedules delivery without a browser staying open',async()=>{
 const f=await fixture();vi.stubEnv('RESEND_API_KEY','test-storage-mail-key');
 const send=vi.fn(async()=>new Response(JSON.stringify({id:'background-accepted'}),{status:200}));vi.stubGlobal('fetch',send);
 const request=await f.owner.mutation(api.storageRequests.request,{source:'marketing'});
 await f.t.finishAllScheduledFunctions(()=>vi.runAllTimers());
 expect(send).toHaveBeenCalledTimes(1);
 expect(await f.owner.query(api.storageRequests.status,{requestId:request.requestId})).toMatchObject({status:'sent',retryAt:null});
});
