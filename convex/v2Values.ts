import {v} from 'convex/values';
export const shapeKind=v.union(v.literal('box'),v.literal('polygon'),v.literal('brush'),v.literal('keypoint'),v.literal('classification'));
export const shapeStatus=v.union(v.literal('pending'),v.literal('verified'),v.literal('disqualified'));
export const shapeValue=v.object({key:v.string(),kind:shapeKind,label:v.string(),time:v.number(),points:v.array(v.number()),brushSize:v.optional(v.number())});
export const shapeFields={episodeId:v.id('episodes'),...shapeValue.fields,revision:v.number(),status:shapeStatus,deleted:v.boolean(),updatedAt:v.number()};
