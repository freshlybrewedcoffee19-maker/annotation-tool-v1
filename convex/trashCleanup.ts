"use node";
import {internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {DeleteObjectCommand} from '@aws-sdk/client-s3';
import {r2Client} from './r2Client';
export const expired=internalAction({args:{},returns:v.null(),handler:async(ctx):Promise<null>=>{
 const items=await ctx.runMutation(internal.trash.claimExpired,{});
 for(const item of items){
  try{
   if(item.keys.length){const {client,bucket}=r2Client();for(const key of item.keys)await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));}
   if(item.storageId)await ctx.runMutation(internal.trash.removeStoredFile,{id:item.id,storageId:item.storageId});
   await ctx.runMutation(internal.trash.mediaRemoved,{id:item.id});
   for(let batch=0;batch<16;batch++)if(await ctx.runMutation(internal.trash.finishPurge,{id:item.id}))break;
  }catch{console.error('An expired Trash item could not be removed; cleanup will retry.');}
 }
 await ctx.runMutation(internal.trash.finishProjects,{});return null;
}});
