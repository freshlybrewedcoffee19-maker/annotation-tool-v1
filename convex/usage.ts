import {query} from './_generated/server';
import {v} from 'convex/values';
import {workspace} from './access';
import {accountUsage,FREE_STORAGE,FREE_VIDEO,FREE_PROJECTS} from './freeLimits';
export const limits=query({args:{workspaceToken:v.string()},returns:v.object({stored:v.number(),reserved:v.number(),projects:v.number(),storageLimit:v.number(),videoLimit:v.number(),projectLimit:v.number(),cloudAI:v.literal(false)}),handler:async(ctx,{workspaceToken})=>({...await accountUsage(ctx,await workspace(ctx,workspaceToken)),storageLimit:FREE_STORAGE,videoLimit:FREE_VIDEO,projectLimit:FREE_PROJECTS,cloudAI:false as const})});

