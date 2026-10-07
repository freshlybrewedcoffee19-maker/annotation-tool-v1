"use node";
import {internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {r2Client} from './r2Client';
export const staging=internalAction({args:{},returns:v.null(),handler:async(ctx):Promise<null>=>{
 const rows=await ctx.runQuery(internal.r2Records.stale,{});if(!rows.length)return null;const {client,bucket}=r2Client();
 for(const row of rows){if(!row.key.startsWith('staging/'))throw new Error('Refusing to clean permanent media.');await client.send(new DeleteObjectCommand({Bucket:bucket,Key:row.key}));await ctx.runMutation(internal.r2Records.cleaned,{id:row.id});}return null;
}});
