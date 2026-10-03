import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
 labelLists: defineTable({key:v.literal("shared"),labels:v.array(v.string())}).index("by_key",["key"]),
 episodes: defineTable({name:v.string(),storageId:v.id("_storage"),duration:v.number()}).index("by_name",["name"]),
 segments: defineTable({episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number()}).index("by_episode",["episodeId"]),
});
