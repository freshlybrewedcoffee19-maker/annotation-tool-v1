import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const productWorkflow=v.union(v.literal('annotation'),v.literal('marketing'));
export const productEventName=v.union(v.literal('recording_attempt'),v.literal('save_succeeded'),v.literal('clip_play'));
export const productTraffic=v.union(v.literal('live'),v.literal('local'),v.literal('test'));

// Tracking has its own table; existing saved work needs no migration or new fields.
export const productEventTables={
 productEvents:defineTable({
  eventId:v.string(),visitorId:v.string(),sessionId:v.string(),
  workflow:productWorkflow,name:productEventName,traffic:productTraffic,
  createdAt:v.number(),sample:v.boolean(),
  actorRole:v.union(v.literal('owner'),v.literal('editor'),v.literal('reviewer'),v.literal('public_reviewer'),v.literal('anonymous')),
  source:v.union(v.literal('voice'),v.literal('manual'),v.literal('unknown')),
  actorId:v.optional(v.id('users')),workspaceId:v.optional(v.id('workspaces')),
  episodeId:v.optional(v.id('episodes')),segmentId:v.optional(v.id('segments')),imageLabelId:v.optional(v.id('imageLabels')),
  cardId:v.optional(v.id('marketingCards')),versionId:v.optional(v.id('marketingVersions')),feedbackId:v.optional(v.id('marketingFeedback')),
 })
  .index('by_visitor_event',['visitorId','eventId'])
  .index('by_session_time',['visitorId','sessionId','createdAt'])
  .index('by_segment_name',['segmentId','name'])
  .index('by_image_label_name',['imageLabelId','name'])
  .index('by_feedback_name',['feedbackId','name'])
  .index('by_time',['createdAt'])
  .index('by_workflow_name_time',['workflow','name','createdAt']),
};
