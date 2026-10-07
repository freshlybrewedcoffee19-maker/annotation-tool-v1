"use node";
import {internalAction} from './_generated/server';
import {v} from 'convex/values';
import {ListObjectsV2Command,GetBucketCorsCommand,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {r2Client} from './r2Client';

export const check=internalAction({args:{},returns:v.object({connected:v.boolean(),browserUploadsAllowed:v.boolean(),message:v.string()}),handler:async()=>{
 try{
  const {client,bucket}=r2Client();
  await client.send(new ListObjectsV2Command({Bucket:bucket,MaxKeys:1}));
  let allowed=false;
  try{const cors=await client.send(new GetBucketCorsCommand({Bucket:bucket}));allowed=!!cors.CORSRules?.some(rule=>rule.AllowedOrigins?.includes('https://cheddarvox.com')&&rule.AllowedMethods?.includes('PUT')&&rule.AllowedMethods?.includes('GET'));}catch{}
  return {connected:true,browserUploadsAllowed:allowed,message:allowed?'Private bucket connection and browser permissions verified.':'Private bucket connected. Browser upload permissions still need configuring or could not be inspected with this key.'};
 }catch{
  return {connected:false,browserUploadsAllowed:false,message:'Could not connect. Check the four R2 environment variables and bucket-scoped Object Read & Write permission.'};
 }
}});
// Isolated test object only; no user account or saved video is changed.
export const prepareProbe=internalAction({args:{},returns:v.object({key:v.string(),put:v.string(),get:v.string()}),handler:async()=>{
 const {client,bucket}=r2Client(),key=`connection-check/${crypto.randomUUID()}.mp4`;
 return {key,put:await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:'video/mp4'}),{expiresIn:300}),get:await getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:300})};
}});
export const removeProbe=internalAction({args:{key:v.string()},returns:v.null(),handler:async(_ctx,{key})=>{if(!/^connection-check\/[a-f0-9-]+\.mp4$/.test(key))throw new Error('Only connection test files can be removed.');const {client,bucket}=r2Client();await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));return null;}});
export const cleanProbes=internalAction({args:{},returns:v.number(),handler:async()=>{const {client,bucket}=r2Client();const files=await client.send(new ListObjectsV2Command({Bucket:bucket,Prefix:'connection-check/',MaxKeys:100}));let removed=0;for(const file of files.Contents??[]){if(file.Key&&/^connection-check\/[a-f0-9-]+\.mp4$/.test(file.Key)){await client.send(new DeleteObjectCommand({Bucket:bucket,Key:file.Key}));removed++;}}return removed;}});
