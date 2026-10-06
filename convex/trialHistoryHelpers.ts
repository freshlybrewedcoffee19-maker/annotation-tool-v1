import type {MutationCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';

export function canonical(value:unknown):string{
 const normalize=(v:any):any=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
 return JSON.stringify(normalize(value));
}
export async function isTrialEpisode(ctx:MutationCtx,episodeId:Id<'episodes'>){
 const ep=await ctx.db.get(episodeId);
 return !!ep?.workspaceId&&(await ctx.db.get(ep.workspaceId))?.kind==='trial';
}
export async function recordTrialEdit(ctx:MutationCtx,episodeId:Id<'episodes'>,kind:'segment'|'outlines',description:string,before:unknown,after:unknown){
 const ep=await ctx.db.get(episodeId);if(!ep?.workspaceId||!await isTrialEpisode(ctx,episodeId))return;
 const beforeText=canonical(before),afterText=canonical(after);if(beforeText===afterText)return;
 const state=await ctx.db.query('trialHistoryState').withIndex('by_episode',q=>q.eq('episodeId',episodeId)).unique();
 const sequence=(state?.sequence??0)+1;
 if(state)await ctx.db.patch(state._id,{sequence});else await ctx.db.insert('trialHistoryState',{episodeId,workspaceId:ep.workspaceId,sequence});
 const redo=await ctx.db.query('trialEditHistory').withIndex('by_episode_state',q=>q.eq('episodeId',episodeId).eq('undone',true)).take(101);
 if(redo.length>100)throw Error('History limit exceeded. Reload before editing.');
 for(const entry of redo)await ctx.db.delete(entry._id);
 await ctx.db.insert('trialEditHistory',{workspaceId:ep.workspaceId,episodeId,sequence,kind,description,before:beforeText,after:afterText,undone:false});
 const oldest=await ctx.db.query('trialEditHistory').withIndex('by_episode_sequence',q=>q.eq('episodeId',episodeId)).order('asc').take(101);
 if(oldest.length>100)await ctx.db.delete(oldest[0]._id);
}
