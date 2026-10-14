import {test,expect,vi} from 'vitest';
import type {FeedbackJob} from '../src/marketing/feedback-queue';
import {uploadFeedbackWithRecovery} from '../src/marketing/upload-recovery';
const draft=():FeedbackJob=>({clientKey:'same-feedback',start:'1',end:'3',text:'Keep this text',blob:new Blob(['voice']),audioUploadId:'expired',audioUploaded:true,versionId:'version',versionNumber:1,videoDuration:10,state:'saving'});

test('expired feedback audio is reserved again once without losing its blob, text or save key',async()=>{
 const job=draft(),blob=job.blob,cancel=vi.fn(async()=>{}),checkpoint=vi.fn(async()=>{}),done=vi.fn(async()=>'existing');
 const upload=vi.fn(async()=>{if(job.audioUploadId==='expired')throw Error('Upload expired. Choose the file again.');expect(job.audioUploaded).toBeUndefined();job.audioUploadId='fresh';return 'audio-id';});
 expect(await uploadFeedbackWithRecovery(job,checkpoint,upload,cancel,done)).toBe('audio-id');
 expect(cancel).toHaveBeenCalledWith('expired');expect(checkpoint).toHaveBeenCalledTimes(1);expect(upload).toHaveBeenCalledTimes(2);expect(done).not.toHaveBeenCalled();
 expect(job).toMatchObject({clientKey:'same-feedback',text:'Keep this text',blob,audioUploadId:'fresh'});
});

test('lost completion responses reuse the completed audio rather than uploading it again',async()=>{
 const job=draft(),upload=vi.fn(async()=>{throw Error('Upload expired or already completed.');}),cancel=vi.fn(async()=>{throw Error('This upload is already saved and cannot be discarded.');}),completed=vi.fn(async()=>'saved-audio');
 expect(await uploadFeedbackWithRecovery(job,async()=>{},upload,cancel,completed)).toBe('saved-audio');
 expect(upload).toHaveBeenCalledTimes(1);expect(completed).toHaveBeenCalledWith('expired');expect(job.audioUploadId).toBe('expired');
});

test('ordinary failures keep the existing upload; a renewed quota rejection retains recoverable audio',async()=>{
 const job=draft(),cancel=vi.fn(async()=>{}),completed=vi.fn(async()=>'audio');
 await expect(uploadFeedbackWithRecovery(job,async()=>{},async()=>{throw Error('Network unavailable');},cancel,completed)).rejects.toThrow('Network');
 expect(cancel).not.toHaveBeenCalled();expect(job.audioUploadId).toBe('expired');
 let calls=0;await expect(uploadFeedbackWithRecovery(job,async()=>{},async()=>{if(!calls++)throw Error('Upload expired');throw Error('Free plan storage limit reached (1 GB).');},cancel,completed)).rejects.toThrow('storage limit');
 expect(job.blob).toBeTruthy();expect(job.text).toBe('Keep this text');expect(job.audioUploadId).toBeUndefined();expect(calls).toBe(2);
});

test('failed cancellation does not drop the pending upload identity',async()=>{
 const job=draft(),upload=vi.fn(async()=>{throw Error('Upload expired');});
 await expect(uploadFeedbackWithRecovery(job,async()=>{},upload,async()=>{throw Error('Offline');},async()=>'audio')).rejects.toThrow('Offline');
 expect(job.audioUploadId).toBe('expired');expect(upload).toHaveBeenCalledTimes(1);
});
