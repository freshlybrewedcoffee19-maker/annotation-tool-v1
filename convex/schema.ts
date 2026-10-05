import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {boxValue} from './boxes';
import {visibilityValue} from './visibility';
export default defineSchema({
 objectVisibility:defineTable({episodeId:v.id('episodes'),spans:v.array(visibilityValue)}).index('by_episode',['episodeId']),
 objects:defineTable({episodeId:v.id('episodes'),objectId:v.string(),name:v.string()}).index('by_episode',['episodeId']).index('by_episode_object',['episodeId','objectId']),
 objectBoxes:defineTable({episodeId:v.id('episodes'),boxes:v.array(boxValue)}).index('by_episode',['episodeId']),
 workspaces:defineTable({token:v.string(),kind:v.union(v.literal("owner"),v.literal("trial"),v.literal("personal"))}).index("by_token",["token"]).index("by_kind",["kind"]),
 fileOwners:defineTable({workspaceId:v.id("workspaces"),storageId:v.id("_storage")}).index("by_storage",["storageId"]).index("by_storage_workspace",["storageId","workspaceId"]),
 trialDatasets:defineTable({key:v.literal("active"),storageId:v.id("_storage"),name:v.string(),duration:v.number(),width:v.number(),height:v.number(),frameRate:v.number(),labels:v.array(v.string()),metadata:v.array(v.object({field:v.string(),value:v.string()}))}).index("by_key",["key"]),
 metadataDefaults:defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),values:v.array(v.object({field:v.string(),value:v.string(),locked:v.boolean()}))}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 metadataFields:defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),fields:v.array(v.string())}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 labelLists: defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),labels:v.array(v.string())}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 episodes: defineTable({labels:v.optional(v.array(v.string())),workspaceId:v.optional(v.id("workspaces")),name:v.string(),storageId:v.id("_storage"),duration:v.number(),fileSize:v.optional(v.number()),mimeType:v.optional(v.string()),width:v.optional(v.number()),height:v.optional(v.number()),frameRate:v.optional(v.union(v.number(),v.null())),nextSegmentNumber:v.optional(v.number()),metadata:v.optional(v.array(v.object({field:v.string(),value:v.string()}))),metadataLocks:v.optional(v.array(v.string()))}).index("by_name",["name"]).index("by_workspace",["workspaceId"]),
 segments: defineTable({objectIds:v.optional(v.array(v.string())),reviewStatus:v.optional(v.union(v.literal("pending"),v.literal("verified"),v.literal("disqualified"))),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number(),segmentNumber:v.optional(v.number()),source:v.optional(v.union(v.literal("manual"),v.literal("voice")))}).index("by_episode",["episodeId"]),
});
