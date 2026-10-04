import {v} from 'convex/values';
import {query,mutation} from './_generated/server';
import {ownedEpisode} from './access';
export const boxValue=v.object({id:v.string(),objectId:v.string(),name:v.string(),time:v.number(),frameIndex:v.union(v.number(),v.null()),timing:v.union(v.literal('decoded'),v.literal('time')),x:v.number(),y:v.number(),width:v.number(),height:v.number()});
export const list=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(boxValue),handler:async(ctx,args)=>{await ownedEpisode(ctx,args.workspaceToken,args.episodeId);return (await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique())?.boxes??[];}});
export const objects=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(v.object({objectId:v.string(),name:v.string()})),handler:async(ctx,args)=>{await ownedEpisode(ctx,args.workspaceToken,args.episodeId);return (await ctx.db.query('objects').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).take(2000)).map(({objectId,name})=>({objectId,name}));}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),boxes:v.array(boxValue)},returns:v.null(),handler:async(ctx,args)=>{
 const ep=await ownedEpisode(ctx,args.workspaceToken,args.episodeId);
 if(args.boxes.length>2000)throw new Error('This video has reached the manual box limit.');
 const ids=new Set<string>();const names=new Map<string,string>();
 for(const b of args.boxes){if(!b.id||!b.objectId||!b.name.trim()||b.name.length>100||ids.has(b.id)||[b.time,b.x,b.y,b.width,b.height].some(n=>!Number.isFinite(n))||b.time<0||b.time>ep.duration||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>1.000001||b.y+b.height>1.000001|| (b.frameIndex!==null&&(!Number.isInteger(b.frameIndex)||b.frameIndex<0))|| (b.timing==='time'&&b.frameIndex!==null))throw new Error('Use a named box inside the video frame.');ids.add(b.id);if(names.has(b.objectId)&&names.get(b.objectId)!==b.name)throw new Error('Object names must agree.');names.set(b.objectId,b.name);}
 for(const [objectId,name] of names){const object=await ctx.db.query('objects').withIndex('by_episode_object',q=>q.eq('episodeId',args.episodeId).eq('objectId',objectId)).unique();if(object&&object.name!==name)throw new Error('Use the saved name for this object.');if(!object)await ctx.db.insert('objects',{episodeId:args.episodeId,objectId,name});}
 const old=await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
 if(old)await ctx.db.patch(old._id,{boxes:args.boxes});else await ctx.db.insert('objectBoxes',{episodeId:args.episodeId,boxes:args.boxes});return null;
}});
