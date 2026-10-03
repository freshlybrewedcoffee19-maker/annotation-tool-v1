import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
const episode = v.object({_id:v.id("episodes"),_creationTime:v.number(),name:v.string(),storageId:v.id("_storage"),duration:v.number(),url:v.union(v.string(),v.null())});
const segment = v.object({_id:v.id("segments"),_creationTime:v.number(),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number()});
export const episodes = query({args:{},returns:v.array(episode),handler:async ctx => Promise.all((await ctx.db.query("episodes").withIndex("by_name").take(1000)).map(async e=>({...e,url:await ctx.storage.getUrl(e.storageId)})))});
export const uploadUrl = mutation({args:{},returns:v.string(),handler:async ctx=>ctx.storage.generateUploadUrl()});
export const addEpisode = mutation({args:{name:v.string(),storageId:v.id("_storage"),duration:v.number()},returns:v.id("episodes"),handler:async(ctx,args)=>{
 if(!args.name.trim() || !Number.isFinite(args.duration) || args.duration<=0) throw new Error("Choose a playable MP4.");
 const file=await ctx.db.system.get(args.storageId); if(!file || !["video/mp4","video/quicktime","video/webm"].includes(file.contentType??"")) throw new Error("Upload an MP4, MOV or WebM video.");
 return ctx.db.insert("episodes",args);
}});
export const segments = query({args:{episodeId:v.id("episodes")},returns:v.array(segment),handler:async(ctx,{episodeId})=>ctx.db.query("segments").withIndex("by_episode",q=>q.eq("episodeId",episodeId)).take(10000)});
export const save = mutation({args:{id:v.optional(v.id("segments")),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number()},returns:v.id("segments"),handler:async(ctx,{id,...args})=>{
 const ep=await ctx.db.get(args.episodeId);
 if(!ep || !args.label.trim() || !Number.isFinite(args.start_sec) || !Number.isFinite(args.end_sec) || args.start_sec<0 || args.end_sec<=args.start_sec || args.end_sec>ep.duration) throw new Error("Use a label and times between 0 and the video duration, with end after start.");
 args.label=args.label.trim();
 if(id){const old=await ctx.db.get(id); if(!old || old.episodeId!==args.episodeId) throw new Error("Segment not found."); await ctx.db.patch(id,args); return id;}
 return ctx.db.insert("segments",args);
}});
export const remove = mutation({args:{id:v.id("segments")},returns:v.null(),handler:async(ctx,{id})=>{await ctx.db.delete(id);return null;}});
export const exportAll = query({args:{},returns:v.array(v.object({episode:v.string(),label:v.string(),start_sec:v.number(),end_sec:v.number()})),handler:async ctx=>{
 const eps=await ctx.db.query("episodes").withIndex("by_name").take(1000);
 const result=[];
 for(const ep of eps){const rows=await ctx.db.query("segments").withIndex("by_episode",q=>q.eq("episodeId",ep._id)).take(10000);for(const row of rows)result.push({episode:ep.name,label:row.label,start_sec:row.start_sec,end_sec:row.end_sec});}
 return result.sort((a,b)=>a.episode.localeCompare(b.episode)||a.start_sec-b.start_sec);
}});
