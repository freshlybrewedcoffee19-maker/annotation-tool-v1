import {test,expect} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
import {FREE_STORAGE,UPLOAD_LIFETIME,UPLOAD_CLEANUP_DELAY} from '../convex/freeLimits';
import type {Id} from '../convex/_generated/dataModel';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const video={kind:'video' as const,title:'Campaign',name:'cut.mp4',size:100,mime:'video/mp4',duration:20,width:1280,height:720,key:'marketing/staging/account-storage-test'};

async function fixture(stored=0){
 const t=convexTest(schema,modules),token='6'.repeat(64);
 const ids=await t.run(async ctx=>{
  const owner=await ctx.db.insert('users',{email:'owner@example.invalid'}),editor=await ctx.db.insert('users',{email:'editor@example.invalid'}),stranger=await ctx.db.insert('users',{});
  const space=await ctx.db.insert('workspaces',{userId:owner,token,kind:'personal'});
  const ep=await ctx.db.insert('episodes',{workspaceId:space,name:'Annotation.mp4',duration:20,fileSize:stored,r2Key:'videos/account-test'});
  return {owner,editor,stranger,space,ep};
 });
 const owner=t.withIdentity({subject:`${ids.owner}|test`}),editor=t.withIdentity({subject:`${ids.editor}|test`}),stranger=t.withIdentity({subject:`${ids.stranger}|test`});
 const reserve=(size:number,cardId?:Id<'marketingCards'>)=>owner.mutation(internal.marketing.reserve,{...video,size,cardId});
 const finish=(uploadId:Id<'marketingUploads'>)=>owner.mutation(internal.marketing.finishUpload,{uploadId,key:`marketing/video/${ids.owner}/${uploadId}`});
 const annotation=(size:number)=>owner.mutation(internal.r2Records.reserve,{workspaceToken:token,key:'staging/account-test',name:'Annotation.mp4',size,mime:'video/mp4',duration:20,width:1280,height:720});
 return {t,ids,token,owner,editor,stranger,reserve,finish,annotation};
}

test('one account limit covers both workflows, exact boundary, pending uploads and completion retries',async()=>{
 const f=await fixture(500_000_000),first=await f.reserve(250_000_000);await f.finish(first);
 const pending=await f.reserve(250_000_000);
 const expected={stored:750_000_000,reserved:250_000_000,storageLimit:FREE_STORAGE};
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({...expected,available:0,owner:true});
 expect(await f.owner.query(api.usage.limits,{workspaceToken:f.token})).toMatchObject(expected);
 for(const attempt of [()=>f.annotation(1),()=>f.reserve(1)]){
  const error=await attempt().catch(error=>error);
  expect(error.data).toMatchObject({code:'STORAGE_LIMIT',storedBytes:750_000_000,reservedBytes:250_000_000,requestedBytes:1,availableBytes:0,owner:true});
 }
 const {key:_key,...actionArgs}=video;
 const actionError=await f.owner.action(api.marketingFiles.begin,{...actionArgs,size:1}).catch(error=>error);
 expect(actionError.data,actionError.message).toMatchObject({code:'STORAGE_LIMIT',requestedBytes:1});
 const result=await f.finish(pending);expect(await f.finish(pending)).toEqual(result);
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:FREE_STORAGE,reserved:0,available:0});
 expect((await f.t.run(ctx=>ctx.db.get(f.ids.ep)))?.r2Key).toBe('videos/account-test');
});

test('competing uploads reserve the last space once across video-feedback and annotation',async()=>{
 const f=await fixture(750_000_000);
 const results=await Promise.allSettled([f.reserve(150_000_000),f.annotation(150_000_000)]);
 expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:750_000_000,reserved:150_000_000,available:100_000_000});
});

test('an invited editor uses the project owner allowance and cannot query or release another account uploads',async()=>{
 const f=await fixture(899_999_900),first=await f.finish(await f.reserve(100)),cardId=first.cardId as Id<'marketingCards'>;
 await f.t.run(ctx=>ctx.db.insert('marketingAccess',{cardId,userId:f.ids.editor,status:'editor',updatedAt:Date.now()}));
 const pending=await f.editor.mutation(internal.marketing.reserve,{...video,cardId,size:100_000_000});
 expect(await f.editor.query(api.marketing.storageQuota,{cardId})).toMatchObject({stored:900_000_000,reserved:100_000_000,available:0,owner:false});
 expect(await f.editor.query(api.marketing.storageQuota,{})).toMatchObject({stored:0,reserved:0,available:FREE_STORAGE,owner:true});
 const error=await f.editor.mutation(internal.marketing.reserve,{...video,cardId,size:1}).catch(error=>error);
 expect(error.data).toMatchObject({code:'STORAGE_LIMIT',owner:false});
 await expect(f.stranger.query(api.marketing.storageQuota,{cardId})).rejects.toThrow('access');
 await expect(f.t.query(api.marketing.storageQuota,{})).rejects.toThrow('Sign in');
 await expect(f.owner.mutation(api.marketing.cancelUpload,{uploadId:pending})).rejects.toThrow('not found');
 await f.editor.mutation(api.marketing.cancelUpload,{uploadId:pending});
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({reserved:0,available:100_000_000});
 // There is no client-settable account ID, paid flag, or storage entitlement.
 await expect(f.owner.query(api.marketing.storageQuota,{storageLimit:2_000_000_000} as never)).rejects.toThrow();
 await expect(f.owner.mutation(internal.marketing.reserve,{...video,paid:true} as never)).rejects.toThrow();
});

test('discard releases only a pending reservation; retries cannot resurrect it or delete saved videos',async()=>{
 const f=await fixture(750_000_000),pending=await f.reserve(250_000_000);
 await f.owner.mutation(api.marketing.cancelUpload,{uploadId:pending});
 await f.owner.mutation(api.marketing.cancelUpload,{uploadId:pending});
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:750_000_000,reserved:0});
 await expect(f.finish(pending)).rejects.toThrow('cancelled');
 await expect(f.owner.query(internal.marketing.pendingUpload,{uploadId:pending})).rejects.toThrow('cancelled');
 const saved=await f.reserve(250_000_000);await f.finish(saved);
 await expect(f.owner.mutation(api.marketing.cancelUpload,{uploadId:saved})).rejects.toThrow('already saved');
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:FREE_STORAGE,reserved:0});
});

test('expired uploads cannot finish; space is released after scratch cleanup and saved final keys are excluded',async()=>{
 const f=await fixture(),pending=await f.reserve(200),saved=await f.reserve(300);const completed=await f.finish(saved);
 await f.t.run(async ctx=>{await ctx.db.patch(pending,{createdAt:Date.now()-UPLOAD_LIFETIME});await ctx.db.patch(saved,{createdAt:Date.now()-UPLOAD_LIFETIME});});
 await expect(f.finish(pending)).rejects.toThrow('expired');
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:300,reserved:200});
 expect(await f.t.query(internal.marketing.staleUploads,{})).toEqual([]);
 await expect(f.t.mutation(internal.marketing.stagingCleaned,{uploadId:pending})).rejects.toThrow('not ready');
 await f.t.run(async ctx=>{await ctx.db.patch(pending,{createdAt:Date.now()-UPLOAD_CLEANUP_DELAY-1});await ctx.db.patch(saved,{createdAt:Date.now()-UPLOAD_CLEANUP_DELAY-1});});
 const cleanup=await f.t.query(internal.marketing.staleUploads,{});
 expect(cleanup.find(row=>row.id===pending)?.keys).toEqual([video.key,`marketing/video/${f.ids.owner}/${pending}`]);
 expect(cleanup.find(row=>row.id===saved)?.keys).toEqual([video.key]);
 // Simulates the cleanup action's acknowledgement after storage deletion succeeds.
 await f.t.mutation(internal.marketing.stagingCleaned,{uploadId:pending});
 await f.t.mutation(internal.marketing.stagingCleaned,{uploadId:saved});
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({stored:300,reserved:0});
 expect((await f.t.run(ctx=>ctx.db.get(completed.versionId)))?.deletedAt).toBeUndefined();
 expect(await f.finish(saved)).toEqual(completed);
});

test('cancelled signed-upload capacity stays in physical budget until scratch cleanup',async()=>{
 const f=await fixture(),pending=await f.reserve(250_000_000);
 await f.owner.mutation(api.marketing.cancelUpload,{uploadId:pending});
 await f.t.run(ctx=>ctx.db.insert('marketingUploads',{...video,key:'marketing/staging/other-account',ownerId:f.ids.stranger,uploaderId:f.ids.stranger,size:2_750_000_000,createdAt:Date.now(),completed:false}));
 await expect(f.annotation(1)).rejects.toThrow('across Cheddar Vox');
 await f.t.run(ctx=>ctx.db.patch(pending,{createdAt:Date.now()-UPLOAD_CLEANUP_DELAY-1}));
 await f.t.mutation(internal.marketing.stagingCleaned,{uploadId:pending});
 await expect(f.annotation(1)).resolves.toBeTruthy();
});

test('cleanup never offers a pending final copy that another video record references',async()=>{
 const f=await fixture(),pending=await f.reserve(100);
 await f.t.run(async ctx=>{await ctx.db.patch(pending,{createdAt:Date.now()-UPLOAD_CLEANUP_DELAY-1});await ctx.db.patch(f.ids.ep,{r2Key:`marketing/video/${f.ids.owner}/${pending}`});});
 expect(await f.t.query(internal.marketing.staleUploads,{})).toEqual([]);
 expect(await f.owner.query(api.marketing.storageQuota,{})).toMatchObject({reserved:100});
});

test('annotation reservations cannot be completed after expiry or after release',async()=>{
 const f=await fixture(),pending=await f.annotation(100);
 await f.t.run(ctx=>ctx.db.patch(pending,{createdAt:Date.now()-UPLOAD_LIFETIME}));
 await expect(f.owner.mutation(internal.r2Records.finish,{workspaceToken:f.token,uploadId:pending,key:'videos/expired'})).rejects.toThrow('expired');
 await f.t.mutation(internal.r2Records.cleaned,{id:pending});
 await f.t.run(ctx=>ctx.db.patch(pending,{createdAt:Date.now()}));
 await expect(f.owner.mutation(internal.r2Records.finish,{workspaceToken:f.token,uploadId:pending,key:'videos/cleaned'})).rejects.toThrow('expired');
 expect(await f.owner.query(api.usage.limits,{workspaceToken:f.token})).toMatchObject({stored:0,reserved:0});
});
