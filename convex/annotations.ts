import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {workspace,ownedEpisode} from "./access";
const episode = v.object({_id:v.id("episodes"),_creationTime:v.number(),workspaceId:v.optional(v.id("workspaces")),name:v.string(),storageId:v.id("_storage"),duration:v.number(),fileSize:v.optional(v.number()),mimeType:v.optional(v.string()),width:v.optional(v.number()),height:v.optional(v.number()),frameRate:v.optional(v.union(v.number(),v.null())),nextSegmentNumber:v.optional(v.number()),metadata:v.optional(v.array(v.object({field:v.string(),value:v.string()}))),metadataLocks:v.optional(v.array(v.string())),url:v.union(v.string(),v.null())});
const segment = v.object({_id:v.id("segments"),_creationTime:v.number(),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number(),segmentNumber:v.optional(v.number()),source:v.optional(v.union(v.literal("manual"),v.literal("voice")))});
export const episodes = query({args:{workspaceToken:v.string()},returns:v.array(episode),handler:async(ctx,{workspaceToken})=>{const space=await workspace(ctx,workspaceToken);return Promise.all((await ctx.db.query("episodes").withIndex("by_workspace",q=>q.eq("workspaceId",space._id)).take(1000)).sort((a,b)=>a.name.localeCompare(b.name)).map(async e=>({...e,url:await ctx.storage.getUrl(e.storageId)})));}});
export const uploadUrl = mutation({args:{workspaceToken:v.string()},returns:v.string(),handler:async(ctx,{workspaceToken})=>{await workspace(ctx,workspaceToken);return process.env.CONVEX_SITE_URL+"/api/upload";}});
export const addEpisode = mutation({args:{workspaceToken:v.string(),name:v.string(),storageId:v.id("_storage"),duration:v.number(),width:v.optional(v.number()),height:v.optional(v.number())},returns:v.id("episodes"),handler:async(ctx,{workspaceToken,...args})=>{
 const space=await workspace(ctx,workspaceToken);const claim=await ctx.db.query("fileOwners").withIndex("by_storage_workspace",q=>q.eq("storageId",args.storageId).eq("workspaceId",space._id)).first();if(!claim)throw new Error("Upload this video to your own workspace first.");
 if(!args.name.trim() || !Number.isFinite(args.duration) || args.duration<=0) throw new Error("Choose a playable MP4.");
 const file=await ctx.db.system.get(args.storageId); if(!file || !["video/mp4","video/quicktime","video/webm"].includes(file.contentType??"")) throw new Error("Upload an MP4, MOV or WebM video.");
 const fields=await ctx.db.query("metadataFields").withIndex("by_workspace",q=>q.eq("workspaceId",space._id)).unique();
 const defaults=await ctx.db.query("metadataDefaults").withIndex("by_workspace",q=>q.eq("workspaceId",space._id)).unique();
 const inherited=(defaults?.values??[]).filter(row=>row.locked&&fields?.fields.includes(row.field));
 return ctx.db.insert("episodes",{workspaceId:space._id,...args,fileSize:file.size,mimeType:file.contentType??"",metadata:inherited.map(({field,value})=>({field,value})),metadataLocks:inherited.map(row=>row.field)});
}});
export const segments = query({args:{workspaceToken:v.string(),episodeId:v.id("episodes")},returns:v.array(segment),handler:async(ctx,{workspaceToken,episodeId})=>{await ownedEpisode(ctx,workspaceToken,episodeId);return ctx.db.query("segments").withIndex("by_episode",q=>q.eq("episodeId",episodeId)).take(10000);}});
export const save = mutation({args:{workspaceToken:v.string(),id:v.optional(v.id("segments")),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number(),source:v.optional(v.union(v.literal("manual"),v.literal("voice")))},returns:v.id("segments"),handler:async(ctx,{workspaceToken,id,...args})=>{
 const ep=await ownedEpisode(ctx,workspaceToken,args.episodeId);
 if(!ep || !args.label.trim() || !Number.isFinite(args.start_sec) || !Number.isFinite(args.end_sec) || args.start_sec<0 || args.end_sec<=args.start_sec || args.end_sec>ep.duration) throw new Error("Use a label and times between 0 and the video duration, with end after start.");
 args.label=args.label.trim();
 if(id){const old=await ctx.db.get(id); if(!old || old.episodeId!==args.episodeId) throw new Error("Segment not found."); const {source,...changes}=args; await ctx.db.patch(id,changes); return id;}
 const segmentNumber=ep.nextSegmentNumber??1;
 await ctx.db.patch(ep._id,{nextSegmentNumber:segmentNumber+1});
 return ctx.db.insert("segments",{...args,segmentNumber,source:args.source??"manual"});
}});
export const remove = mutation({args:{workspaceToken:v.string(),id:v.id("segments")},returns:v.null(),handler:async(ctx,{workspaceToken,id})=>{const row=await ctx.db.get(id);if(!row)throw new Error("Segment not found.");await ownedEpisode(ctx,workspaceToken,row.episodeId);await ctx.db.delete(id);return null;}});
export const exportAll = query({args:{workspaceToken:v.string()},returns:v.array(v.object({episode:v.string(),label:v.string(),start_sec:v.number(),end_sec:v.number()})),handler:async(ctx,{workspaceToken})=>{
 const space=await workspace(ctx,workspaceToken);
 const eps=await ctx.db.query("episodes").withIndex("by_workspace",q=>q.eq("workspaceId",space._id)).take(1000);
 const result=[];
 for(const ep of eps){const rows=await ctx.db.query("segments").withIndex("by_episode",q=>q.eq("episodeId",ep._id)).take(10000);for(const row of rows)result.push({episode:ep.name,label:row.label,start_sec:row.start_sec,end_sec:row.end_sec});}
 return result.sort((a,b)=>a.episode.localeCompare(b.episode)||a.start_sec-b.start_sec);
}});
