"use node";
import {action} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import type {Id,Doc} from './_generated/dataModel';
import {PutObjectCommand,GetObjectCommand,HeadObjectCommand,CopyObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {r2Client} from './r2Client';
export const begin=action({args:{workspaceToken:v.string(),name:v.string(),size:v.number(),mime:v.string(),duration:v.number(),width:v.number(),height:v.number()},returns:v.object({uploadId:v.id('r2Uploads'),url:v.string()}),handler:async(ctx,args):Promise<{uploadId:Id<'r2Uploads'>;url:string}>=>{
 const owner=await ctx.runQuery(internal.r2Records.owner,{workspaceToken:args.workspaceToken});const {client,bucket}=r2Client();const key=`staging/${owner}/${crypto.randomUUID()}`;
 const uploadId=await ctx.runMutation(internal.r2Records.reserve,{...args,key});const url=await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:args.mime}),{expiresIn:3600});return {uploadId,url};
}});
export const complete=action({args:{workspaceToken:v.string(),uploadId:v.id('r2Uploads')},returns:v.id('episodes'),handler:async(ctx,args):Promise<Id<'episodes'>>=>{
 const row:Doc<"r2Uploads">=await ctx.runQuery(internal.r2Records.pending,args);if(row.episodeId)return row.episodeId;if(Date.now()-row.createdAt>86400000)throw new Error('Upload expired. Try again.');
 const {client,bucket}=r2Client();const head=await client.send(new HeadObjectCommand({Bucket:bucket,Key:row.key}));if(head.ContentLength!==row.size||head.ContentType!==row.mime)throw new Error('Video upload is incomplete. Try again.');
 // Final media never uses the still-writable upload address.
 const key=`videos/${row.workspaceId}/${args.uploadId}`;
 await client.send(new CopyObjectCommand({Bucket:bucket,Key:key,CopySource:`${bucket}/${row.key}`,CopySourceIfMatch:head.ETag}));
 const id=await ctx.runMutation(internal.r2Records.finish,{...args,key});
 // Clean only this upload's temporary copy after the permanent record is saved.
 await client.send(new DeleteObjectCommand({Bucket:bucket,Key:row.key})).catch(()=>{});
 return id;
}});
export const playback=action({args:{workspaceToken:v.string(),episodeId:v.id('episodes')},returns:v.union(v.string(),v.null()),handler:async(ctx,args):Promise<string|null>=>{const key=await ctx.runQuery(internal.r2Records.video,args);if(!key)return null;const {client,bucket}=r2Client();return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:3600});}});

