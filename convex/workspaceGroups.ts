import {v} from 'convex/values';
import type {Doc,Id} from './_generated/dataModel';
import type {QueryCtx} from './_generated/server';

export const accountTypeValue=v.union(v.literal('registered'),v.literal('anonymous'),v.literal('test'),v.literal('unknown'));
export type WorkspaceAccountType='registered'|'anonymous'|'test'|'unknown';

// This describes the workspace owner, not the author of an individual annotation.
// Test status is assigned only by an explicit audit; names/content never imply it.
export async function workspaceAccountType(ctx:QueryCtx,space:Doc<'workspaces'>|null):Promise<WorkspaceAccountType>{
 if(!space)return 'unknown';
 if(space.accountType==='test')return 'test';
 if(!space.userId)return 'anonymous';
 return await ctx.db.get(space.userId)?'registered':'unknown';
}

export async function segmentAccountFields(ctx:QueryCtx,episode:Doc<'episodes'>|null):Promise<{workspaceId?:Id<'workspaces'>;accountType:WorkspaceAccountType}>{
 if(!episode?.workspaceId)return {accountType:'unknown'};
 const space=await ctx.db.get(episode.workspaceId);
 return {workspaceId:episode.workspaceId,accountType:await workspaceAccountType(ctx,space)};
}
