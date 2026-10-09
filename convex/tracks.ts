import {v,type Infer} from 'convex/values';
import {mutation,query,type QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {requireProjectPermission} from './projectAccess';
import {ownedEpisode} from './access';
import {boxValue} from './boxes';
import {canonical} from './trialHistoryHelpers';
export const trackFrame=v.object({time:v.number(),x:v.number(),y:v.number(),width:v.number(),height:v.number(),uncertain:v.boolean()});
export const trackFields={anchors:v.optional(v.array(boxValue)),episodeId:v.id('episodes'),objectId:v.string(),name:v.string(),key:v.string(),model:v.string(),start:v.number(),end:v.number(),frames:v.array(trackFrame),originalFrames:v.optional(v.array(trackFrame)),status:v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified')),revision:v.number()};
async function reasons(ctx:QueryCtx,t:{anchors?:Infer<typeof boxValue>[];episodeId:Id<'episodes'>;objectId:string;start:number;end:number;frames:{time:number;uncertain:boolean}[]}){
 const spans=(await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',t.episodeId)).unique())?.spans??[];const messages:string[]=[];
 if(t.frames.some(f=>f.uncertain))messages.push('Correct and confirm the uncertain frames first.');
 if(spans.some(s=>s.objectId===t.objectId&&(t.anchors?s.start<=t.end:s.start<t.end)&&s.end>t.start))messages.push('This clip overlaps an absent or Needs checking span. It cannot be accepted.');
 if(t.anchors){const prior=spans.filter(s=>s.objectId===t.objectId&&s.end<=t.start).sort((a,b)=>b.end-a.end)[0];if(prior&&!prior.reappearanceBoxId)messages.push('Confirm this object’s reappearance after the earlier visibility span first.');}
 if(!t.frames.length||t.frames[0].time-t.start>.26||t.end-t.frames.at(-1)!.time>.26||t.frames.some((f,i)=>i>0&&f.time-t.frames[i-1].time>.26))messages.push('This clip has gaps in its sampled frames.');
 if(t.anchors){const boxes=(await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',t.episodeId)).unique())?.boxes??[];if(t.anchors.some(a=>canonical(boxes.find(b=>b.id===a.id)??null)!==canonical(a)))messages.push('A source box changed or was removed. Create a fresh movement draft from checked boxes.');}
 return messages;
}
export const interpolate=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),startBoxId:v.string(),endBoxId:v.string(),continuouslyVisible:v.boolean()},returns:v.id('trackSuggestions'),handler:async(ctx,a)=>{
 await ownedEpisode(ctx,a.workspaceToken,a.episodeId);
 await requireProjectPermission(ctx,a.episodeId,'create');if(!a.continuouslyVisible)throw Error('Check that the same object stays visible throughout this short clip.');
 const boxes=(await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique())?.boxes??[];
 const first=boxes.find(b=>b.id===a.startBoxId),last=boxes.find(b=>b.id===a.endBoxId);
 if(!first||!last||first.points||last.points||first.reviewStatus!=='verified'||last.reviewStatus!=='verified'||first.objectId!==last.objectId||last.time<=first.time||last.time-first.time>2)throw Error('Choose two verified boxes for the same object, in time order and at most two seconds apart.');
 const spans=(await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).unique())?.spans??[];
 if(spans.some(s=>s.objectId===first.objectId&&s.start<=last.time&&s.end>first.time))throw Error('This range contains an absent or Needs checking span. Confirm reappearance before starting a new range.');
 const priorSpan=spans.filter(s=>s.objectId===first.objectId&&s.end<=first.time).sort((a,b)=>b.end-a.end)[0];if(priorSpan&&!priorSpan.reappearanceBoxId)throw Error('Confirm this object’s reappearance after the earlier visibility span first.');
 const existing=await ctx.db.query('trackSuggestions').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(500);
 const anchors=[first,last];const prior=existing.find(t=>t.anchors&&canonical(t.anchors)===canonical(anchors));if(prior)return prior._id;
 if(existing.length>=500)throw Error('Suggestion limit reached for this video.');
 const steps=Math.ceil((last.time-first.time)*5);
 const frames=Array.from({length:steps+1},(_,i)=>{const fraction=i/steps;return {time:first.time+(last.time-first.time)*fraction,x:first.x+(last.x-first.x)*fraction,y:first.y+(last.y-first.y)*fraction,width:first.width+(last.width-first.width)*fraction,height:first.height+(last.height-first.height)*fraction,uncertain:true};});
 return ctx.db.insert('trackSuggestions',{episodeId:a.episodeId,objectId:first.objectId,name:first.name,key:`manual-draft:${existing.length}:${Date.now()}`,model:'Manual straight-line draft / v1',anchors,start:first.time,end:last.time,frames,originalFrames:frames,status:'pending',revision:1});
}});
const resultValue=v.object({...trackFields,_id:v.id('trackSuggestions'),_creationTime:v.number(),blocked:v.array(v.string())});
export const list=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(resultValue),handler:async(ctx,a)=>{await ownedEpisode(ctx,a.workspaceToken,a.episodeId);const rows=await ctx.db.query('trackSuggestions').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(500);return Promise.all(rows.map(async t=>({...t,blocked:await reasons(ctx,t)})));}});
export const add=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),objectId:v.string(),name:v.string(),key:v.string(),model:v.string(),start:v.number(),end:v.number(),frames:v.array(trackFrame)},returns:v.id('trackSuggestions'),handler:async(ctx,a)=>{
 await requireProjectPermission(ctx,a.episodeId,'create');const ep=await ownedEpisode(ctx,a.workspaceToken,a.episodeId);if(!a.objectId||!a.name.trim()||a.name.length>100||!a.key||a.key.length>200||!a.model||a.model.length>200||!Number.isFinite(a.start)||!Number.isFinite(a.end)||a.start<0||a.end<=a.start||a.end>ep.duration||a.end-a.start>2.01||!a.frames.length||a.frames.length>30)throw Error('Use a named suggestion clip of at most two seconds.');
 validateFrames(a.frames,a.start,a.end);
 const prior=await ctx.db.query('trackSuggestions').withIndex('by_episode_key',q=>q.eq('episodeId',a.episodeId).eq('key',a.key)).unique();if(prior)return prior._id;
 if((await ctx.db.query('trackSuggestions').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(500)).length>=500)throw Error('Suggestion limit reached for this video.');
 const object=await ctx.db.query('objects').withIndex('by_episode_object',q=>q.eq('episodeId',a.episodeId).eq('objectId',a.objectId)).unique();if(object&&object.name!==a.name)throw Error('Use the saved object name.');if(!object)await ctx.db.insert('objects',{episodeId:a.episodeId,objectId:a.objectId,name:a.name});
 const {workspaceToken,...fields}=a;return ctx.db.insert('trackSuggestions',{...fields,originalFrames:a.frames,status:'pending',revision:1});
}});
function validateFrames(frames:{time:number;x:number;y:number;width:number;height:number}[],start:number,end:number){if(frames.some((f,i)=>[f.time,f.x,f.y,f.width,f.height].some(n=>!Number.isFinite(n))||f.time<start||f.time>end||f.x<0||f.y<0||f.width<=0||f.height<=0||f.x+f.width>1.000001||f.y+f.height>1.000001||(i>0&&f.time<=frames[i-1].time)))throw Error('Use ordered frames and boxes inside the video.');}
async function owned(ctx:QueryCtx,token:string,id:Id<'trackSuggestions'>){const t=await ctx.db.get(id);if(!t)throw Error('Suggestion not found.');await ownedEpisode(ctx,token,t.episodeId);return t;}
export const review=mutation({args:{workspaceToken:v.string(),id:v.id('trackSuggestions'),revision:v.number(),status:v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified'))},returns:v.null(),handler:async(ctx,a)=>{const t=await owned(ctx,a.workspaceToken,a.id);if(t.revision!==a.revision)throw Error('This suggestion changed. Review the latest version.');if(a.status==='verified'){const blocked=await reasons(ctx,t);if(blocked.length)throw Error(blocked.join(' '));}await ctx.db.patch(t._id,{status:a.status});return null;}});
export const edit=mutation({args:{workspaceToken:v.string(),id:v.id('trackSuggestions'),revision:v.number(),frames:v.array(trackFrame)},returns:v.null(),handler:async(ctx,a)=>{const t=await owned(ctx,a.workspaceToken,a.id);if(t.revision!==a.revision)throw Error('This suggestion changed. Reload its frames.');if(a.frames.length!==t.frames.length||a.frames.some((f,i)=>f.time!==t.frames[i].time))throw Error('Preserve the sampled frame times.');validateFrames(a.frames,t.start,t.end);await ctx.db.patch(t._id,{frames:a.frames,status:'pending',revision:t.revision+1});return null;}});
export const exportVerified=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(resultValue),handler:async(ctx,a)=>{await ownedEpisode(ctx,a.workspaceToken,a.episodeId);const rows=await ctx.db.query('trackSuggestions').withIndex('by_episode',q=>q.eq('episodeId',a.episodeId)).take(500);const checked=await Promise.all(rows.map(async t=>({...t,blocked:await reasons(ctx,t)})));return checked.filter(t=>t.status==='verified'&&!t.blocked.length);}});


