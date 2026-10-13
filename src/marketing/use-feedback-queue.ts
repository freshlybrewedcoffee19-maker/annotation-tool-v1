import {useEffect,useSyncExternalStore} from 'react';
import {useAction,useMutation,useSample} from './hooks';
import {api} from '../../convex/_generated/api';
import {readDraft,writeDrafts} from './drafts';
import {FeedbackQueue,type FeedbackJob} from './feedback-queue';
import {uploadFile} from './uploadFile';

const stores=new Map<string,FeedbackQueue>();
export function useFeedbackQueue(cardId:string,account:string|null){
 const sample=useSample(),key=`queue:${sample?sample.id:account??'pending'}:${cardId}`;
 if(!stores.has(key))stores.set(key,new FeedbackQueue(key,{read:()=>sample?Promise.resolve([]):readDraft<FeedbackJob[]>(key),write:entries=>sample?Promise.resolve():writeDrafts(entries)}));
 const queue=stores.get(key)!;
 useSyncExternalStore(queue.subscribe,queue.snapshot);
 const begin=useAction(api.marketingFiles.begin),resume=useAction(api.marketingFiles.resume),complete=useAction(api.marketingFiles.complete),save=useMutation(api.marketing.saveFeedback);
 useEffect(()=>{if(account===null&&!sample)return;void queue.init().catch(()=>{});queue.bind({
  upload:async(job,checkpoint)=>{
   if(sample){const id=crypto.randomUUID();sample.audio.set(id,URL.createObjectURL(job.blob!));return id;}
   const mime=job.blob!.type.split(';')[0]||'audio/wav';
   if(!job.audioUploadId){const result=await begin({cardId,versionId:job.versionId,kind:'audio',title:'Voice feedback',name:'feedback.'+(mime==='audio/wav'?'wav':mime==='audio/mp4'?'m4a':mime.split('/')[1]),mime,size:job.blob!.size,duration:Math.max(.1,Number(job.end)-Number(job.start)),width:0,height:0});job.audioUploadId=result.uploadId;await checkpoint();}
   if(!job.audioUploaded){const url=await resume({uploadId:job.audioUploadId});const response=await uploadFile(url,job.blob!,mime);if(!response.ok)throw Error('Recording upload failed. Your audio and transcript are queued; retry below.');job.audioUploaded=true;await checkpoint();}
   return (await complete({uploadId:job.audioUploadId})).audioId;
  },
  save:job=>save({cardId,versionId:job.versionId,start:Number(job.start),end:Number(job.end),text:job.text,audioId:job.audioId,clientKey:job.clientKey})
 });},[queue,account,sample,cardId,begin,resume,complete,save]);
 return queue;
}
