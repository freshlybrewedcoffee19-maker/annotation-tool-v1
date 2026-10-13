import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {boxValue} from './boxes';
import {visibilityValue} from './visibility';
import {trackFields} from './tracks';
import {draftValue} from './projectSetup';
import {authTables} from '@convex-dev/auth/server';
import {maskFields} from './masks';
import {shapeFields} from './v2Values';
import {marketingTables} from './marketingSchema';
export default defineSchema({
 ...marketingTables,
 imageLabels:defineTable({episodeId:v.id('episodes'),label:v.string(),normalizedLabel:v.string(),clientKey:v.string(),source:v.union(v.literal('manual'),v.literal('voice')),reviewStatus:v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified'))}).index('by_episode',['episodeId']).index('by_episode_key',['episodeId','clientKey']).index('by_episode_label',['episodeId','normalizedLabel']),
 v2Videos:defineTable({workspaceId:v.id('workspaces'),episodeId:v.id('episodes'),sample:v.boolean()}).index('by_workspace',['workspaceId']).index('by_episode',['episodeId']),
 v2Shapes:defineTable(shapeFields).index('by_episode',['episodeId']).index('by_episode_key',['episodeId','key']),
 maskPixels:defineTable({episodeId:v.id('episodes'),maskId:v.id('pixelMasks'),runs:v.array(v.number())}).index('by_episode',['episodeId']).index('by_mask',['maskId']),
 pixelMasks:defineTable(maskFields).index('by_episode',['episodeId']),
 ...authTables,
 projectMembers:defineTable({projectId:v.id('projects'),userId:v.id('users'),role:v.union(v.literal('annotator'),v.literal('reviewer'))}).index('by_project',['projectId']).index('by_user',['userId']).index('by_project_user',['projectId','userId']),
 projectInvites:defineTable({projectId:v.id('projects'),token:v.string(),role:v.union(v.literal('annotator'),v.literal('reviewer')),expiresAt:v.number(),usedBy:v.optional(v.id('users')),revoked:v.optional(v.boolean())}).index('by_token',['token']).index('by_project',['projectId']),
 videoLeases:defineTable({episodeId:v.id('episodes'),userId:v.id('users'),expiresAt:v.number()}).index('by_episode',['episodeId']),
 videoSessions:defineTable({episodeId:v.id('episodes'),userId:v.id('users'),position:v.number(),activity:v.string(),step:v.string(),updatedAt:v.number()}).index('by_user_episode',['userId','episodeId']).index('by_user',['userId']).index('by_episode',['episodeId']),
 videoTrash:defineTable({episodeId:v.id('episodes'),workspaceId:v.id('workspaces'),sourceProject:v.optional(v.id('projects')),deletedAt:v.number(),purgeAfter:v.number(),projectDeletionAt:v.optional(v.number()),purgeStartedAt:v.optional(v.number()),mediaRemovedAt:v.optional(v.number())}).index('by_episode',['episodeId']).index('by_workspace',['workspaceId']).index('by_expiry',['purgeAfter']),
 setupDrafts:defineTable({episodeId:v.id('episodes'),draft:draftValue,episodeIds:v.optional(v.array(v.id('episodes'))),status:v.optional(v.union(v.literal('pending'),v.literal('completed'),v.literal('skipped')))}).index('by_episode',['episodeId']),
 projectSettings:defineTable({projectId:v.id('projects'),draft:draftValue}).index('by_project',['projectId']),
 r2Uploads:defineTable({mediaType:v.optional(v.union(v.literal("image"),v.literal("video"))),version:v.optional(v.literal(2)),workspaceId:v.id('workspaces'),key:v.string(),name:v.string(),size:v.number(),mime:v.string(),duration:v.number(),width:v.number(),height:v.number(),createdAt:v.number(),cleanedAt:v.optional(v.number()),episodeId:v.optional(v.id('episodes'))}).index('by_workspace',['workspaceId']).index('by_cleanup',['cleanedAt','createdAt']).index('by_created',['createdAt']).index('by_episode',['episodeId']),
 projects:defineTable({workspaceId:v.id('workspaces'),name:v.string(),thumbnail:v.optional(v.string()),updatedAt:v.number(),deletedAt:v.optional(v.number()),purgeAfter:v.optional(v.number())}).index('by_workspace',['workspaceId']).index('by_purge',['purgeAfter']),
 projectVideos:defineTable({projectId:v.id('projects'),episodeId:v.id('episodes'),workspaceId:v.id('workspaces')}).index('by_project',['projectId']).index('by_episode',['episodeId']).index('by_workspace',['workspaceId']),
 trialHistoryState:defineTable({episodeId:v.id('episodes'),workspaceId:v.id('workspaces'),sequence:v.number()}).index('by_episode',['episodeId']),
 trialEditHistory:defineTable({episodeId:v.id('episodes'),workspaceId:v.id('workspaces'),sequence:v.number(),kind:v.union(v.literal('segment'),v.literal('outlines')),description:v.string(),before:v.string(),after:v.string(),undone:v.boolean()}).index('by_episode_sequence',['episodeId','sequence']).index('by_episode_state',['episodeId','undone','sequence']),
 users:defineTable({name:v.optional(v.string()),image:v.optional(v.string()),email:v.optional(v.string()),emailVerificationTime:v.optional(v.number()),phone:v.optional(v.string()),phoneVerificationTime:v.optional(v.number()),isAnonymous:v.optional(v.boolean()),guidePreference:v.optional(v.union(v.literal('on'),v.literal('off')))}).index('email',['email']).index('phone',['phone']),
 datasetRequests:defineTable({workspaceId:v.id('workspaces'),name:v.string(),email:v.string(),organization:v.string(),task:v.string(),dataSource:v.union(v.literal('collect'),v.literal('existing'),v.literal('both')),volume:v.string(),status:v.literal('new')}).index('by_workspace',['workspaceId']),
 trackSuggestions:defineTable(trackFields).index('by_episode',['episodeId']).index('by_episode_key',['episodeId','key']),
 objectVisibility:defineTable({episodeId:v.id('episodes'),spans:v.array(visibilityValue)}).index('by_episode',['episodeId']),
 objects:defineTable({episodeId:v.id('episodes'),objectId:v.string(),name:v.string()}).index('by_episode',['episodeId']).index('by_episode_object',['episodeId','objectId']),
 objectBoxes:defineTable({episodeId:v.id('episodes'),boxes:v.array(boxValue)}).index('by_episode',['episodeId']),
 workspaces:defineTable({userId:v.optional(v.id('users')),token:v.string(),kind:v.union(v.literal("owner"),v.literal("trial"),v.literal("personal"))}).index("by_token",["token"]).index("by_kind",["kind"]).index('by_user',['userId']),
 fileOwners:defineTable({workspaceId:v.id("workspaces"),storageId:v.id("_storage")}).index("by_storage",["storageId"]).index("by_storage_workspace",["storageId","workspaceId"]),
 trialDatasets:defineTable({key:v.literal("active"),storageId:v.id("_storage"),name:v.string(),duration:v.number(),width:v.number(),height:v.number(),frameRate:v.number(),labels:v.array(v.string()),metadata:v.array(v.object({field:v.string(),value:v.string()}))}).index("by_key",["key"]),
 metadataDefaults:defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),values:v.array(v.object({field:v.string(),value:v.string(),locked:v.boolean()}))}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 metadataFields:defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),fields:v.array(v.string())}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 labelLists: defineTable({workspaceId:v.optional(v.id("workspaces")),key:v.literal("shared"),labels:v.array(v.string())}).index("by_key",["key"]).index("by_workspace",["workspaceId"]),
 episodes: defineTable({mediaType:v.optional(v.union(v.literal("image"),v.literal("video"))),setupFields:v.optional(v.array(v.string())),labels:v.optional(v.array(v.string())),workspaceId:v.optional(v.id("workspaces")),name:v.string(),storageId:v.optional(v.id("_storage")),r2Key:v.optional(v.string()),duration:v.number(),fileSize:v.optional(v.number()),mimeType:v.optional(v.string()),width:v.optional(v.number()),height:v.optional(v.number()),frameRate:v.optional(v.union(v.number(),v.null())),nextSegmentNumber:v.optional(v.number()),metadata:v.optional(v.array(v.object({field:v.string(),value:v.string()}))),metadataLocks:v.optional(v.array(v.string()))}).index("by_name",["name"]).index("by_workspace",["workspaceId"]).index("by_storage",["storageId"]).index("by_r2",["r2Key"]),
 segments: defineTable({historyHidden:v.optional(v.boolean()),objectIds:v.optional(v.array(v.string())),reviewStatus:v.optional(v.union(v.literal("pending"),v.literal("verified"),v.literal("disqualified"))),episodeId:v.id("episodes"),label:v.string(),start_sec:v.number(),end_sec:v.number(),segmentNumber:v.optional(v.number()),source:v.optional(v.union(v.literal("manual"),v.literal("voice")))}).index("by_episode",["episodeId"]),
});
