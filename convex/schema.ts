import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
 metadataFields:defineTable({key:v.literal("shared"),fields:v.array(v.string())}).index("by_key",["key"]),
 labelLists: defineTable({key:v.literal("shared"),labels:v.array(v.string())}).index("by_key",["key"]),
 episodes: defineTable({name:v.string(),storageId:v.id("_storage"),duration:v.number(),fileSize:v.optional(v.number()),mimeType:v.optional(v.string()),width:v.optional(v.number()),height:v.optional(v.number()),frameRate:v.optional(v.union(v.number(),v.null())),nextSegmentNumber:v.optional(v.number()),metadata:v.optional(v.array(v.object({field:v.string(),value:v.string()})))}).index("by_name",["name"]),
 segments: defineTable({episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number(),segmentNumber:v.optional(v.number()),source:v.optional(v.union(v.literal("manual"),v.literal("voice")))}).index("by_episode",["episodeId"]),
});
