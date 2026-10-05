import {v} from 'convex/values';
import {query,mutation} from './_generated/server';
import {ownedEpisode} from './access';
const reviewStatus=v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified'));
export const boxValue=v.object({points:v.optional(v.array(v.object({x:v.number(),y:v.number()}))),reviewStatus:v.optional(reviewStatus),id:v.string(),objectId:v.string(),name:v.string(),time:v.number(),frameIndex:v.union(v.number(),v.null()),timing:v.union(v.literal('decoded'),v.literal('time')),x:v.number(),y:v.number(),width:v.number(),height:v.number()});
export const list=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(boxValue),handler:async(ctx,args)=>{await ownedEpisode(ctx,args.workspaceToken,args.episodeId);return (await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique())?.boxes??[];}});
export const objects=query({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.array(v.object({objectId:v.string(),name:v.string()})),handler:async(ctx,args)=>{await ownedEpisode(ctx,args.workspaceToken,args.episodeId);return (await ctx.db.query('objects').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).take(2000)).map(({objectId,name})=>({objectId,name}));}});
export const save=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),boxes:v.array(boxValue)},returns:v.null(),handler:async(ctx,args)=>{
 const ep=await ownedEpisode(ctx,args.workspaceToken,args.episodeId);
 if(args.boxes.length>2000)throw new Error('This video has reached the manual box limit.');
 const ids=new Set<string>();const names=new Map<string,string>();
 for(const b of args.boxes){if(!b.id||!b.objectId||!b.name.trim()||b.name.length>100||ids.has(b.id)||[b.time,b.x,b.y,b.width,b.height].some(n=>!Number.isFinite(n))||b.time<0||b.time>ep.duration||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>1.000001||b.y+b.height>1.000001|| (b.frameIndex!==null&&(!Number.isInteger(b.frameIndex)||b.frameIndex<0))|| (b.timing==='time'&&b.frameIndex!==null))throw new Error('Use a named box inside the video frame.');ids.add(b.id);if(names.has(b.objectId)&&names.get(b.objectId)!==b.name)throw new Error('Object names must agree.');names.set(b.objectId,b.name);}
 for(const b of args.boxes){if(b.points){const ps=b.points;if(ps.length<3||ps.length>100||ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw new Error('Use 3 to 100 polygon corners inside the frame.');const area=Math.abs(ps.reduce((a,p,i)=>{const n=ps[(i+1)%ps.length];return a+p.x*n.y-n.x*p.y;},0))/2;if(area<.000025)throw new Error('Polygon corners must enclose an area.');const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));if(Math.abs(b.x-x)>1e-6||Math.abs(b.y-y)>1e-6||Math.abs(b.width-(Math.max(...ps.map(p=>p.x))-x))>1e-6||Math.abs(b.height-(Math.max(...ps.map(p=>p.y))-y))>1e-6)throw new Error('Polygon bounds must match its corners.');}}
 for(const [objectId,name] of names){const object=await ctx.db.query('objects').withIndex('by_episode_object',q=>q.eq('episodeId',args.episodeId).eq('objectId',objectId)).unique();if(object&&object.name!==name)throw new Error('Use the saved name for this object.');if(!object)await ctx.db.insert('objects',{episodeId:args.episodeId,objectId,name});}
 const old=await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
 const checked=args.boxes.map(b=>{const previous=old?.boxes.find(p=>p.id===b.id);const unchanged=previous&&JSON.stringify(previous.points??null)===JSON.stringify(b.points??null)&&(['objectId','name','time','x','y','width','height','frameIndex','timing'] as const).every(k=>previous[k]===b[k]);return {...b,reviewStatus:unchanged?(previous.reviewStatus??'pending'):'pending' as const};});
 const visibility=await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
 if(visibility)await ctx.db.patch(visibility._id,{spans:visibility.spans.map(s=>{if(!s.reappearanceBoxId)return s;const b=checked.find(b=>b.id===s.reappearanceBoxId);if(b?.reviewStatus==='verified')return s;const {reappearanceBoxId,...rest}=s;return rest;})});
 if(old)await ctx.db.patch(old._id,{boxes:checked});else await ctx.db.insert('objectBoxes',{episodeId:args.episodeId,boxes:checked});return null;
}});
export const review=mutation({args:{workspaceToken:v.string(),episodeId:v.id('episodes'),boxId:v.string(),status:reviewStatus},returns:v.null(),handler:async(ctx,args)=>{
 await ownedEpisode(ctx,args.workspaceToken,args.episodeId);
 const row=await ctx.db.query('objectBoxes').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();
 if(!row||!row.boxes.some(b=>b.id===args.boxId))throw new Error('Box not found.');
 if(args.status!=='verified'){const visibility=await ctx.db.query('objectVisibility').withIndex('by_episode',q=>q.eq('episodeId',args.episodeId)).unique();if(visibility)await ctx.db.patch(visibility._id,{spans:visibility.spans.map(s=>{if(s.reappearanceBoxId!==args.boxId)return s;const {reappearanceBoxId,...rest}=s;return rest;})});}
 await ctx.db.patch(row._id,{boxes:row.boxes.map(b=>b.id===args.boxId?{...b,reviewStatus:args.status}:b)});return null;
}});
