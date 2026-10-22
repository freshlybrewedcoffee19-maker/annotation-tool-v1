import {afterEach, expect, test, vi} from 'vitest';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const record=makeFunctionReference<'mutation'>('productEvents:record');
const base={eventId:'event-0001',visitorId:'visitor-0001',sessionId:'session-0001',traffic:'live' as const};
const token='a'.repeat(64),editorToken='b'.repeat(64),reviewToken='d'.repeat(64);
afterEach(()=>vi.useRealTimers());

async function fixture(){
 const t=convexTest(schema,modules);
 const d=await t.run(async ctx=>{
  const owner=await ctx.db.insert('users',{name:'Private owner',email:'private@test.invalid'});
  const editor=await ctx.db.insert('users',{name:'Editor'}),stranger=await ctx.db.insert('users',{name:'Stranger'});
  const workspaceId=await ctx.db.insert('workspaces',{userId:owner,token,kind:'personal'});
  const editorSpace=await ctx.db.insert('workspaces',{userId:editor,token:editorToken,kind:'personal'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Secret footage',duration:60});
  const otherEpisode=await ctx.db.insert('episodes',{workspaceId,name:'Other footage',duration:60});
  const segmentId=await ctx.db.insert('segments',{episodeId,label:'Private transcript',start_sec:1,end_sec:2,source:'voice'});
  const otherSegment=await ctx.db.insert('segments',{episodeId:otherEpisode,label:'Other transcript',start_sec:1,end_sec:2,source:'manual'});
  const projectId=await ctx.db.insert('projects',{workspaceId,name:'Private project',updatedAt:1});
  await ctx.db.insert('projectVideos',{workspaceId,projectId,episodeId});
  await ctx.db.insert('projectMembers',{projectId,userId:editor,role:'annotator'});
  const cardId=await ctx.db.insert('marketingCards',{ownerId:owner,title:'Private card',status:'needs_feedback',finalised:false,cleaning:false,updatedAt:1});
  const otherCard=await ctx.db.insert('marketingCards',{ownerId:stranger,title:'Other card',status:'needs_feedback',finalised:false,cleaning:false,updatedAt:1});
  const uploadId=await ctx.db.insert('marketingUploads',{ownerId:owner,uploaderId:owner,cardId,kind:'video',title:'Private title',name:'secret.mp4',key:'private/file',size:1,mime:'video/mp4',duration:60,width:640,height:360,createdAt:1,completed:true});
  const versionId=await ctx.db.insert('marketingVersions',{cardId,uploadId,number:1,name:'Private version',key:'private/file',size:1,mime:'video/mp4',duration:60,width:640,height:360,uploaderId:owner,uploadedAt:1});
  const otherVersion=await ctx.db.insert('marketingVersions',{cardId:otherCard,uploadId,number:1,name:'Other version',key:'private/other',size:1,mime:'video/mp4',duration:60,width:640,height:360,uploaderId:stranger,uploadedAt:1});
  const audioId=await ctx.db.insert('marketingUploads',{ownerId:owner,uploaderId:editor,cardId,versionId,kind:'audio',title:'Private audio',name:'secret.webm',key:'private/audio',size:1,mime:'audio/webm',duration:1,width:0,height:0,createdAt:1,completed:true});
  const feedbackId=await ctx.db.insert('marketingFeedback',{cardId,versionId,authorId:editor,start:1,end:2,text:'Private feedback',audioId,clientKey:'save-one',createdAt:1,updatedAt:1,reviewed:false});
  const otherFeedback=await ctx.db.insert('marketingFeedback',{cardId:otherCard,versionId:otherVersion,authorId:stranger,start:1,end:2,text:'Other feedback',clientKey:'other-save',createdAt:1,updatedAt:1,reviewed:false});
  await ctx.db.insert('marketingAccess',{cardId,userId:editor,status:'editor',updatedAt:1});
  const linkId=await ctx.db.insert('marketingLinks',{cardId,token:reviewToken,revoked:false,createdAt:1});
  return {owner,editor,stranger,workspaceId,editorSpace,episodeId,otherEpisode,segmentId,otherSegment,projectId,cardId,otherCard,versionId,otherVersion,feedbackId,otherFeedback,linkId};
 });
 const identity=(id:string)=>t.withIdentity({subject:`${id}|session`});
 const rows=()=>t.run(ctx=>ctx.db.query('productEvents').take(200));
 return {t,d,owner:identity(d.owner),editor:identity(d.editor),stranger:identity(d.stranger),rows};
}

test('annotation attempts use server time, preserve private content, and never acquire or change editing locks',async()=>{
 const f=await fixture();
 const leaseId=await f.t.run(ctx=>ctx.db.insert('videoLeases',{episodeId:f.d.episodeId,userId:f.d.owner,expiresAt:Date.now()+60000}));
 const before=await f.t.run(ctx=>ctx.db.get(leaseId));
 const started=Date.now();
 expect(await f.editor.mutation(record,{...base,workflow:'annotation',name:'recording_attempt',workspaceToken:editorToken,episodeId:f.d.episodeId})).toBeNull();
 const [row]=await f.rows();
 expect(row).toMatchObject({name:'recording_attempt',actorRole:'editor',actorId:f.d.editor,source:'voice',sample:false,traffic:'live',workspaceId:f.d.workspaceId});
 expect(row.createdAt).toBeGreaterThanOrEqual(started);
 expect(await f.t.run(ctx=>ctx.db.get(leaseId))).toEqual(before);
 await f.t.run(ctx=>ctx.db.delete(leaseId));
 await f.owner.mutation(record,{...base,eventId:'event-0002',workflow:'annotation',name:'recording_attempt',workspaceToken:token,episodeId:f.d.episodeId});
 expect(await f.t.run(ctx=>ctx.db.query('videoLeases').take(5))).toEqual([]);
 const saved=JSON.stringify(await f.rows());
 for(const secret of [token,editorToken,'Private transcript','Secret footage','private@test.invalid','Private owner'])expect(saved).not.toContain(secret);
});

test('annotation saved rows are verified, deduplicated across retries and browsers, and never changed',async()=>{
 const f=await fixture();
 const before=await f.t.run(ctx=>ctx.db.get(f.d.segmentId));
 const args={...base,workflow:'annotation',name:'save_succeeded',workspaceToken:token,episodeId:f.d.episodeId,segmentId:f.d.segmentId};
 await f.owner.mutation(record,args);
 await f.owner.mutation(record,args);
 await f.owner.mutation(record,{...args,eventId:'event-0002',visitorId:'visitor-0002'});
 expect(await f.rows()).toHaveLength(1);
 expect((await f.rows())[0]).toMatchObject({source:'voice',actorRole:'owner',sample:false});
 expect(await f.t.run(ctx=>ctx.db.get(f.d.segmentId))).toEqual(before);
 await f.owner.mutation(record,{...args,eventId:'event-0003',name:'clip_play'});
 expect(await f.rows()).toHaveLength(2);
});

test('missing, unauthorized, mismatched, and hidden annotation records cannot create events',async()=>{
 const f=await fixture(),args={...base,workflow:'annotation',name:'save_succeeded',workspaceToken:token,episodeId:f.d.episodeId,segmentId:f.d.segmentId};
 await expect(f.stranger.mutation(record,args)).rejects.toThrow();
 await expect(f.owner.mutation(record,{...args,segmentId:undefined})).rejects.toThrow();
 await expect(f.owner.mutation(record,{...args,segmentId:f.d.otherSegment})).rejects.toThrow();
 await expect(f.owner.mutation(record,{...args,workspaceToken:undefined})).rejects.toThrow();
 await f.t.run(ctx=>ctx.db.patch(f.d.segmentId,{historyHidden:true}));
 await expect(f.owner.mutation(record,args)).rejects.toThrow();
 await f.t.run(ctx=>ctx.db.delete(f.d.segmentId));
 await expect(f.owner.mutation(record,args)).rejects.toThrow();
 expect(await f.rows()).toEqual([]);
});

test('annotation sample and test-account labels come from saved workspace and video records',async()=>{
 const f=await fixture(),args={...base,workflow:'annotation',name:'save_succeeded',workspaceToken:token,episodeId:f.d.episodeId,segmentId:f.d.segmentId};
 await f.owner.mutation(record,{...args,sample:true});
 expect((await f.rows())[0]).toMatchObject({sample:false,traffic:'live'});
 await f.t.run(ctx=>ctx.db.insert('v2Videos',{workspaceId:f.d.workspaceId,episodeId:f.d.episodeId,sample:true}));
 await f.t.run(ctx=>ctx.db.patch(f.d.workspaceId,{accountType:'test'}));
 await f.owner.mutation(record,{...args,eventId:'event-0002',name:'clip_play'});
 expect((await f.rows())[1]).toMatchObject({sample:true,traffic:'test',source:'voice'});
 await f.t.run(ctx=>ctx.db.patch(f.d.workspaceId,{kind:'trial'}));
 await f.owner.mutation(record,{...base,eventId:'event-0003',workflow:'annotation',name:'recording_attempt',workspaceToken:token,episodeId:f.d.otherEpisode});
 expect((await f.rows())[2]).toMatchObject({sample:true,traffic:'test',source:'voice'});
});

test('marketing private events distinguish owner and editor and verify existing saved feedback',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'save_succeeded',cardId:f.d.cardId,versionId:f.d.versionId,feedbackId:f.d.feedbackId};
 const before=await f.t.run(ctx=>ctx.db.get(f.d.feedbackId));
 await f.editor.mutation(record,args);
 await f.editor.mutation(record,{...args,eventId:'event-0002',visitorId:'visitor-0002'});
 expect(await f.rows()).toHaveLength(1);
 expect((await f.rows())[0]).toMatchObject({actorRole:'editor',source:'voice',sample:false});
 await f.owner.mutation(record,{...args,eventId:'event-0003',name:'clip_play'});
 expect((await f.rows())[1]).toMatchObject({actorRole:'owner'});
 expect(await f.t.run(ctx=>ctx.db.get(f.d.feedbackId))).toEqual(before);
 await f.t.run(ctx=>ctx.db.patch(f.d.feedbackId,{audioId:undefined}));
 await f.editor.mutation(record,{...args,eventId:'event-0004',name:'clip_play'});
 expect((await f.rows())[2]).toMatchObject({source:'unknown'});
});

test('private marketing events reject missing access and cross-card or cross-version feedback',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'save_succeeded',cardId:f.d.cardId,versionId:f.d.versionId,feedbackId:f.d.feedbackId};
 await expect(f.t.mutation(record,args)).rejects.toThrow();
 await expect(f.stranger.mutation(record,args)).rejects.toThrow();
 await expect(f.editor.mutation(record,{...args,feedbackId:undefined})).rejects.toThrow();
 await expect(f.editor.mutation(record,{...args,cardId:undefined})).rejects.toThrow();
 await expect(f.editor.mutation(record,{...args,versionId:f.d.otherVersion})).rejects.toThrow();
 await expect(f.editor.mutation(record,{...args,feedbackId:f.d.otherFeedback})).rejects.toThrow();
 await expect(f.editor.mutation(record,{...args,sample:true})).rejects.toThrow();
 expect(await f.rows()).toEqual([]);
});

test('public clip play verifies the review link and retains real owner/editor roles',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'clip_play',reviewToken,cardId:f.d.cardId,versionId:f.d.versionId,feedbackId:f.d.feedbackId};
 await f.t.mutation(record,args);
 await f.owner.mutation(record,{...args,eventId:'event-0002'});
 await f.editor.mutation(record,{...args,eventId:'event-0003'});
 expect((await f.rows()).map(row=>row.actorRole)).toEqual(['public_reviewer','owner','editor']);
 expect(JSON.stringify(await f.rows())).not.toContain(reviewToken);
 await expect(f.t.mutation(record,{...args,eventId:'event-0004',feedbackId:f.d.otherFeedback})).rejects.toThrow();
 await expect(f.t.mutation(record,{...args,eventId:'event-0005',versionId:f.d.otherVersion})).rejects.toThrow();
 await expect(f.t.mutation(record,{...args,eventId:'event-0006',cardId:f.d.otherCard})).rejects.toThrow();
 await expect(f.t.mutation(record,{...args,eventId:'event-0007',name:'save_succeeded'})).rejects.toThrow();
 await f.t.run(ctx=>ctx.db.patch(f.d.linkId,{revoked:true}));
 await expect(f.t.mutation(record,{...args,eventId:'event-0008'})).rejects.toThrow();
 expect(await f.rows()).toHaveLength(3);
});

test('anonymous local marketing sample events stay separate and cannot attach private records',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'save_succeeded',sample:true,traffic:'local'};
 await f.t.mutation(record,args);
 await f.t.mutation(record,{...args,eventId:'event-0002',name:'clip_play'});
 expect(await f.rows()).toHaveLength(2);
 expect((await f.rows())[0]).toMatchObject({sample:true,source:'unknown',actorRole:'anonymous',traffic:'local'});
 await expect(f.t.mutation(record,{...args,eventId:'event-0003',cardId:f.d.cardId})).rejects.toThrow();
 await expect(f.t.mutation(record,{...args,eventId:'event-0004',reviewToken})).rejects.toThrow();
 expect(await f.rows()).toHaveLength(2);
});

test('known test accounts override marketing live traffic labels',async()=>{
 const f=await fixture();
 await f.t.run(ctx=>ctx.db.patch(f.d.workspaceId,{accountType:'test'}));
 await f.editor.mutation(record,{...base,workflow:'marketing',name:'recording_attempt',cardId:f.d.cardId,versionId:f.d.versionId});
 expect((await f.rows())[0]).toMatchObject({traffic:'test',source:'voice'});
});

test('only bounded identifiers and known enums are accepted and cross-workflow fields are rejected',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'recording_attempt',sample:true};
 for(const bad of [{eventId:''},{visitorId:'x'.repeat(129)},{sessionId:'private@email.invalid'},{name:'transcript'},{traffic:'production'},{episodeId:f.d.episodeId}])await expect(f.t.mutation(record,{...args,...bad})).rejects.toThrow();
 expect(await f.rows()).toEqual([]);
});

test('replayed event IDs are deduplicated per visitor and excessive session events are quietly capped',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(1_900_000_000_000);
 const f=await fixture(),args={...base,workflow:'marketing',name:'recording_attempt',sample:true};
 await f.t.mutation(record,args);await f.t.mutation(record,args);
 await f.t.mutation(record,{...args,visitorId:'visitor-0002'});
 expect(await f.rows()).toHaveLength(2);
 for(let n=2;n<=125;n++)expect(await f.t.mutation(record,{...args,eventId:`event-${String(n).padStart(4,'0')}`})).toBeNull();
 expect((await f.rows()).filter(row=>row.visitorId===base.visitorId)).toHaveLength(120);
 vi.setSystemTime(Date.now()+60001);
 await f.t.mutation(record,{...args,eventId:'event-next-minute'});
 expect((await f.rows()).filter(row=>row.visitorId===base.visitorId)).toHaveLength(121);
});

test('existing rows remain accepted without any new tracking fields',async()=>{
 const f=await fixture();
 const previous=await f.t.run(async ctx=>({episode:await ctx.db.get(f.d.episodeId),segment:await ctx.db.get(f.d.segmentId),card:await ctx.db.get(f.d.cardId),feedback:await ctx.db.get(f.d.feedbackId)}));
 await f.owner.mutation(record,{...base,workflow:'annotation',name:'recording_attempt',workspaceToken:token,episodeId:f.d.episodeId});
 const after=await f.t.run(async ctx=>({episode:await ctx.db.get(f.d.episodeId),segment:await ctx.db.get(f.d.segmentId),card:await ctx.db.get(f.d.cardId),feedback:await ctx.db.get(f.d.feedbackId)}));
 expect(after).toEqual(previous);
});

test('image label saves verify their episode and deduplicate the saved label',async()=>{
 const f=await fixture();
 const labels=await f.t.run(async ctx=>{
  const episodeId=await ctx.db.insert('episodes',{workspaceId:f.d.workspaceId,name:'Private image',duration:0,mediaType:'image'});
  const imageLabelId=await ctx.db.insert('imageLabels',{episodeId,label:'Private spoken label',normalizedLabel:'private spoken label',clientKey:'image-label-one',source:'voice',reviewStatus:'pending'});
  const otherLabel=await ctx.db.insert('imageLabels',{episodeId:f.d.otherEpisode,label:'Other image label',normalizedLabel:'other image label',clientKey:'image-label-other',source:'manual',reviewStatus:'pending'});
  return {episodeId,imageLabelId,otherLabel};
 });
 const args={...base,eventId:`annotation:save:${labels.imageLabelId}`,workflow:'annotation',name:'save_succeeded',workspaceToken:token,episodeId:labels.episodeId,imageLabelId:labels.imageLabelId};
 await f.owner.mutation(record,args);
 await f.owner.mutation(record,{...args,eventId:'event-0002',visitorId:'visitor-0002'});
 expect(await f.rows()).toHaveLength(1);
 expect((await f.rows())[0]).toMatchObject({imageLabelId:labels.imageLabelId,source:'voice',sample:false});
 expect(JSON.stringify(await f.rows())).not.toContain('Private spoken label');
 await expect(f.stranger.mutation(record,{...args,eventId:'event-0003'})).rejects.toThrow();
 await expect(f.owner.mutation(record,{...args,eventId:'event-0004',imageLabelId:labels.otherLabel})).rejects.toThrow();
 await expect(f.owner.mutation(record,{...args,eventId:'event-0005',segmentId:f.d.segmentId})).rejects.toThrow();
 await f.t.run(ctx=>ctx.db.delete(labels.imageLabelId));
 await expect(f.owner.mutation(record,{...args,eventId:'event-0006'})).rejects.toThrow();
 expect(await f.rows()).toHaveLength(1);
});

test('event IDs support bounded client save keys while visitor and session IDs stay short',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'recording_attempt',sample:true};
 await f.t.mutation(record,{...args,eventId:'a'.repeat(256)});
 await expect(f.t.mutation(record,{...args,eventId:'a'.repeat(257)})).rejects.toThrow('identifier');
 await expect(f.t.mutation(record,{...args,visitorId:'a'.repeat(129)})).rejects.toThrow('identifier');
 await expect(f.t.mutation(record,{...args,sessionId:'a'.repeat(129)})).rejects.toThrow('identifier');
 expect(await f.rows()).toHaveLength(1);
});

test('public viewers with pending invitations or removed access are never counted as editors',async()=>{
 const f=await fixture(),args={...base,workflow:'marketing',name:'clip_play',reviewToken,cardId:f.d.cardId,versionId:f.d.versionId,feedbackId:f.d.feedbackId};
 const grant=await f.t.run(ctx=>ctx.db.query('marketingAccess').withIndex('by_card_user',q=>q.eq('cardId',f.d.cardId).eq('userId',f.d.editor)).unique());
 for(const [n,status] of (['invited','requested','removed'] as const).entries()){
  await f.t.run(ctx=>ctx.db.patch(grant!._id,{status}));
  await f.editor.mutation(record,{...args,eventId:`event-role-${n}`});
  await expect(f.editor.mutation(record,{...args,eventId:`event-private-${n}`,reviewToken:undefined})).rejects.toThrow('access');
 }
 expect((await f.rows()).map(row=>row.actorRole)).toEqual(['public_reviewer','public_reviewer','public_reviewer']);
});

test('reviewer and legacy manual annotation sources are retained without editing leases',async()=>{
 const f=await fixture();
 await f.t.run(async ctx=>{
  const member=await ctx.db.query('projectMembers').withIndex('by_project_user',q=>q.eq('projectId',f.d.projectId).eq('userId',f.d.editor)).unique();
  await ctx.db.patch(member!._id,{role:'reviewer'});
  await ctx.db.patch(f.d.segmentId,{source:'manual'});
 });
 await f.editor.mutation(record,{...base,workflow:'annotation',name:'clip_play',workspaceToken:editorToken,episodeId:f.d.episodeId,segmentId:f.d.segmentId});
 expect((await f.rows())[0]).toMatchObject({actorRole:'reviewer',source:'manual'});
 expect(await f.t.run(ctx=>ctx.db.query('videoLeases').take(5))).toEqual([]);
});

test('anonymous annotation sample saves retain verified voice and manual sources without changing saved rows',async()=>{
 const f=await fixture(),trialToken='e'.repeat(64);
 const d=await f.t.run(async ctx=>{
  const workspaceId=await ctx.db.insert('workspaces',{token:trialToken,kind:'trial'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Trial video',duration:60});
  const imageEpisodeId=await ctx.db.insert('episodes',{workspaceId,name:'Trial image',duration:0,mediaType:'image'});
  const segmentId=await ctx.db.insert('segments',{episodeId,label:'Private trial voice',start_sec:1,end_sec:2,source:'voice'});
  const imageLabelId=await ctx.db.insert('imageLabels',{episodeId:imageEpisodeId,label:'Private trial label',normalizedLabel:'private trial label',clientKey:'trial-label-one',source:'manual',reviewStatus:'pending'});
  return {episodeId,imageEpisodeId,segmentId,imageLabelId};
 });
 const readSaved=()=>f.t.run(async ctx=>({segment:await ctx.db.get(d.segmentId),imageLabel:await ctx.db.get(d.imageLabelId)}));
 const before=await readSaved();
 const args={...base,workflow:'annotation',name:'save_succeeded',workspaceToken:trialToken};
 await f.t.mutation(record,{...args,episodeId:d.episodeId,segmentId:d.segmentId});
 await f.t.mutation(record,{...args,eventId:'event-trial-image',episodeId:d.imageEpisodeId,imageLabelId:d.imageLabelId});
 const rows=await f.rows();
 expect(rows[0]).toMatchObject({sample:true,actorRole:'anonymous',source:'voice',segmentId:d.segmentId});
 expect(rows[1]).toMatchObject({sample:true,actorRole:'anonymous',source:'manual',imageLabelId:d.imageLabelId});
 expect(rows.every(row=>row.actorId===undefined)).toBe(true);
 expect(await readSaved()).toEqual(before);
 expect(await f.t.run(ctx=>ctx.db.query('videoLeases').take(5))).toEqual([]);
});
