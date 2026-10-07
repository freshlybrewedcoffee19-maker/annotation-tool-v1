"use node";
import {S3Client} from '@aws-sdk/client-s3';

// Credentials remain in backend environment variables, never in browser code.
export function r2Client(){
 const endpoint=process.env.R2_ENDPOINT,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY,bucket=process.env.R2_BUCKET;
 if(!endpoint||!accessKeyId||!secretAccessKey||!bucket)throw new Error('Private video storage is not configured.');
 const parsed=new URL(endpoint);
 if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.r2.cloudflarestorage.com')||parsed.username||parsed.password||parsed.search)throw new Error('Use the Cloudflare R2 S3 endpoint.');
 return {bucket,client:new S3Client({region:'auto',endpoint:parsed.origin,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'})};
}
