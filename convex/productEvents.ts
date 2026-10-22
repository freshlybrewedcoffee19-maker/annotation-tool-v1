import {getAuthUserId} from '@convex-dev/auth/server';
import {v,type Infer} from 'convex/values';
import {mutation,type QueryCtx} from './_generated/server';
import type {Doc,Id} from './_generated/dataModel';
import {ownedEpisode,workspace} from './access';
import {episodeProject,projectRole} from './projectAccess';
import {cardAccess} from './marketing';
import {productEventName,productTraffic,productWorkflow} from './productEventSchema';

const recordArgs={
 eventId:v.string(),visitorId:v.string(),sessionId:v.string(),
 workflow:productWorkflow,name:productEventName,traffic:productTraffic,
 sample:v.optional(v.boolean()),workspaceToken:v.optional(v.string()),
 episodeId:v.optional(v.id('episodes')),segmentId:v.optional(v.id('segments')),imageLabelId:v.optional(v.id('imageLabels')),
 cardId:v.optional(v.id('marketingCards')),versionId:v.optional(v.id('marketingVersions')),
 feedbackId:v.optional(v.id('marketingFeedback')),reviewToken:v.optional(v.string()),
};
const recordArgsValidator=v.object(recordArgs);
type Args=Infer<typeof recordArgsValidator>;
type ContextFields=Pick<Doc<'productEvents'>,'sample'|'actorRole'|'source'|'traffic'|'actorId'|'workspaceId'|'episodeId'|'segmentId'|'imageLabelId'|'cardId'|'versionId'|'feedbackId'>;
const IDENTIFIER=/^[A-Za-z0-9_-]{8,128}$/;
const EVENT_IDENTIFIER=/^[A-Za-z0-9_:-]{8,256}$/;
const TOKEN=/^[a-f0-9]{64}$/;
const SESSION_LIMIT=120;

async function isTestUser(ctx:QueryCtx,userId:Id<'users'>|null){
 if(!userId)return false;
 const spaces=await ctx.db.query('workspaces').withIndex('by_user',q=>q.eq('userId',userId)).take(100);
 return spaces.some(space=>space.accountType==='test');
}

async function annotationContext(ctx:QueryCtx,args:Args):Promise<ContextFields>{
 if(args.cardId!==undefined||args.versionId!==undefined||args.feedbackId!==undefined||args.reviewToken!==undefined)throw new Error('Invalid annotation event context.');
 if(!args.workspaceToken||!args.episodeId)throw new Error('Annotation events require a workspace and video.');
 // Explicitly read-only: the default access helper can acquire a lease in mutations.
 const episode=await ownedEpisode(ctx,args.workspaceToken,args.episodeId,'read');
 const callerSpace=await workspace(ctx,args.workspaceToken);
 const space=episode.workspaceId?await ctx.db.get(episode.workspaceId):null;
 const actorId=await getAuthUserId(ctx);
 let actorRole:ContextFields['actorRole']='anonymous';
 if(actorId&&space?.userId===actorId)actorRole='owner';
 else if(actorId){
  const projectId=await episodeProject(ctx,episode._id);
  if(projectId){const access=await projectRole(ctx,projectId);actorRole=access.role==='annotator'?'editor':access.role;}
 }
 const video=await ctx.db.query('v2Videos').withIndex('by_episode',q=>q.eq('episodeId',episode._id)).unique();
 const sample=space?.kind==='trial'||video?.sample===true;
 if(args.segmentId&&args.imageLabelId)throw new Error('Choose one saved annotation for this event.');
 const segment=args.segmentId?await ctx.db.get(args.segmentId):null;
 const imageLabel=args.imageLabelId?await ctx.db.get(args.imageLabelId):null;
 if(args.segmentId&&(!segment||segment.episodeId!==episode._id||segment.historyHidden))throw new Error('Saved annotation is unavailable for this video.');
 if(args.imageLabelId&&(!imageLabel||imageLabel.episodeId!==episode._id||episode.mediaType!=='image'))throw new Error('Saved image label is unavailable for this image.');
 if(args.name==='clip_play'&&imageLabel)throw new Error('Image labels do not have video clips.');
 if(args.name!=='recording_attempt'&&!segment&&!imageLabel)throw new Error('This event requires a saved annotation.');
 return {
  actorId:actorId??undefined,actorRole,workspaceId:episode.workspaceId,
  episodeId:episode._id,segmentId:segment?._id,imageLabelId:imageLabel?._id,sample,
  source:args.name==='recording_attempt'?'voice':(segment??imageLabel)?.source??'unknown',
  traffic:space?.accountType==='test'||callerSpace.accountType==='test'?'test':args.traffic,
 };
}

async function marketingContext(ctx:QueryCtx,args:Args):Promise<ContextFields>{
 if(args.workspaceToken!==undefined||args.episodeId!==undefined||args.segmentId!==undefined||args.imageLabelId!==undefined)throw new Error('Invalid marketing event context.');
 const actorId=await getAuthUserId(ctx);
 if(args.sample){
  if(args.cardId!==undefined||args.versionId!==undefined||args.feedbackId!==undefined||args.reviewToken!==undefined)throw new Error('Sample events cannot refer to private records.');
  return {actorId:actorId??undefined,actorRole:'anonymous',sample:true,source:'unknown',traffic:await isTestUser(ctx,actorId)?'test':args.traffic};
 }
 if(!args.cardId||!args.versionId)throw new Error('Marketing events require a card and version.');
 let card:Doc<'marketingCards'>;
 let actorRole:ContextFields['actorRole'];
 if(args.reviewToken!==undefined){
  if(args.name!=='clip_play'||!TOKEN.test(args.reviewToken))throw new Error('Review links allow clip playback events only.');
  const link=await ctx.db.query('marketingLinks').withIndex('by_token',q=>q.eq('token',args.reviewToken!)).unique();
  if(!link||link.revoked||link.cardId!==args.cardId)throw new Error('This review link is unavailable.');
  const savedCard=await ctx.db.get(link.cardId);
  if(!savedCard)throw new Error('This review card is unavailable.');
  card=savedCard;
  actorRole='public_reviewer';
  if(actorId===card.ownerId)actorRole='owner';
  else if(actorId){
   const grant=await ctx.db.query('marketingAccess').withIndex('by_card_user',q=>q.eq('cardId',card._id).eq('userId',actorId)).unique();
   if(grant?.status==='editor')actorRole='editor';
  }
 }else{
  const access=await cardAccess(ctx,args.cardId);
  card=access.card;actorRole=access.owner?'owner':'editor';
 }
 const version=await ctx.db.get(args.versionId);
 if(!version||version.cardId!==card._id||version.deletedAt)throw new Error('This video version is unavailable for this card.');
 const feedback=args.feedbackId?await ctx.db.get(args.feedbackId):null;
 if(args.feedbackId&&(!feedback||feedback.cardId!==card._id||feedback.versionId!==version._id))throw new Error('Saved feedback is unavailable for this version.');
 if(args.name!=='recording_attempt'&&!feedback)throw new Error('This event requires saved feedback.');
 // Mobile voice can save text without an audio file; absence of audio is not proof of typing.
 const source=args.name==='recording_attempt'?'voice':feedback?.audioId?'voice':'unknown';
 const testAccount=await isTestUser(ctx,card.ownerId)||await isTestUser(ctx,actorId);
 return {
  actorId:actorId??undefined,actorRole,cardId:card._id,versionId:version._id,feedbackId:feedback?._id,
  sample:false,source,traffic:testAccount?'test':args.traffic,
 };
}

export const record=mutation({
 args:recordArgs,returns:v.null(),
 handler:async(ctx,args)=>{
  if(!EVENT_IDENTIFIER.test(args.eventId))throw new Error('Invalid tracking event identifier.');
  for(const id of [args.visitorId,args.sessionId])if(!IDENTIFIER.test(id))throw new Error('Invalid tracking identifier.');
  const context=args.workflow==='annotation'?await annotationContext(ctx,args):await marketingContext(ctx,args);
  const prior=await ctx.db.query('productEvents').withIndex('by_visitor_event',q=>q.eq('visitorId',args.visitorId).eq('eventId',args.eventId)).first();
  if(prior)return null;
  // A saved row counts once even if the client retries with a fresh event/browser ID.
  if(args.name==='save_succeeded'){
   if(context.segmentId&&await ctx.db.query('productEvents').withIndex('by_segment_name',q=>q.eq('segmentId',context.segmentId).eq('name','save_succeeded')).first())return null;
   if(context.imageLabelId&&await ctx.db.query('productEvents').withIndex('by_image_label_name',q=>q.eq('imageLabelId',context.imageLabelId).eq('name','save_succeeded')).first())return null;
   if(context.feedbackId&&await ctx.db.query('productEvents').withIndex('by_feedback_name',q=>q.eq('feedbackId',context.feedbackId).eq('name','save_succeeded')).first())return null;
  }
  const now=Date.now();
  const recent=await ctx.db.query('productEvents').withIndex('by_session_time',q=>q.eq('visitorId',args.visitorId).eq('sessionId',args.sessionId).gt('createdAt',now-60000)).take(SESSION_LIMIT);
  if(recent.length>=SESSION_LIMIT)return null;
  // Explicit allowlist: no workspace keys, review tokens, audio, text, names or email.
  await ctx.db.insert('productEvents',{
   eventId:args.eventId,visitorId:args.visitorId,sessionId:args.sessionId,
   workflow:args.workflow,name:args.name,createdAt:now,...context,
  });
  return null;
 },
});
