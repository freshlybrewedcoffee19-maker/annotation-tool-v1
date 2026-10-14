import type {FeedbackJob} from './feedback-queue';

function notice(error:unknown){return error instanceof Error?error.message:String(error);}

/** Retry an expired reservation once while keeping the original recording and save key. */
export async function uploadFeedbackWithRecovery(job:FeedbackJob,checkpoint:()=>Promise<void>,upload:()=>Promise<string|undefined>,cancel:(id:string)=>Promise<unknown>,completed:(id:string)=>Promise<string|undefined>){
 try{return await upload();}catch(error){
  if(!job.audioUploadId||!/(?:upload expired|upload was cancelled|upload.*already completed)/i.test(notice(error)))throw error;
  const prior=job.audioUploadId;
  try{await cancel(prior);}catch(cancelError){
   // Completion may have succeeded before its response reached the browser.
   // Reuse that recording instead of creating another copy.
   if(/already saved/i.test(notice(cancelError)))return completed(prior);
   throw cancelError;
  }
  job.audioUploadId=undefined;job.audioUploaded=undefined;await checkpoint();
  return upload();
 }
}
