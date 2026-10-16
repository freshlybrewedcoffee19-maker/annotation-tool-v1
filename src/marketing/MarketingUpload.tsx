import {uploadFile} from './uploadFile';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useAction,useMutation,useQuery} from './hooks';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {VideoUploadRecovery,type PendingVideoUpload as Pending} from './video-upload-recovery';
import type {UploadProgress} from './upload-progress';
import {message} from './types';
import {StorageLimitDialog} from '../StorageLimitDialog';
import {storageLimitFromError,storageSize,type StorageQuota,type StorageLimitDetails} from '../storage-quota';
type Props={cardId?:string;done:(id:string)=>void;disabled?:boolean};
export function MarketingUpload(props:Props){const user=useQuery(api.accounts.me,{});return user?<Upload key={user.email} {...props} account={user.email}/>:<p role="status">Preparing upload…</p>;}
function Upload({cardId,done,disabled=false,account}:Props&{account:string}){
 const quota=useQuery(api.marketing.storageQuota,{cardId:cardId as Id<'marketingCards'>|undefined}) as StorageQuota|undefined,cancel=useMutation(api.marketing.cancelUpload),[limit,setLimit]=useState<StorageLimitDetails|null>(null);
 const begin=useAction(api.marketingFiles.begin),complete=useAction(api.marketingFiles.complete),resume=useAction(api.marketingFiles.resume),[pending,setPending]=useState<Pending|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState<UploadProgress|null>(null);
 const input=useRef<HTMLInputElement>(null),running=useRef(false),key=`upload:${account}:${cardId??'new'}`,recovery=useMemo(()=>new VideoUploadRecovery(key),[key]);
 useEffect(()=>{let active=true;setReady(false);void recovery.read().then(value=>{if(active&&value){setPending(value);setStatus('An unfinished upload is ready to retry.');}}).catch(()=>{if(active)setError('Browser recovery storage is unavailable. Keep this tab open while uploading.');}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[recovery]);
 async function persist(value:Pending){setPending({...value});await recovery.save(value).catch(()=>setError('Browser recovery storage is unavailable. Keep this tab open until the upload finishes.'));}
 async function upload(value:Pending){
  if(running.current)return;running.current=true;setBusy(true);setError('');setProgress(null);
  try{
   // Copy the original file once while metadata is read and the upload is authorised.
   const stored=persist(value);let url:string|undefined;
   const mime=value.file.type==='video/quicktime'?'video/quicktime':value.file.type==='video/webm'?'video/webm':'video/mp4';
   if(!value.uploadId){
    setStatus('Checking video…');const dimensions=await videoDimensions(value.file);
    const result=await begin({cardId:cardId as Id<'marketingCards'>|undefined,kind:'video',title:value.file.name.replace(/\.[^.]+$/,''),name:value.file.name,size:value.file.size,mime,...dimensions});
    value.uploadId=result.uploadId;url=result.url;await stored;await persist(value);
   }else await stored;
   if(!value.uploaded){
    setStatus('Uploading video…');url??=await resume({uploadId:value.uploadId!});
    const response=await uploadFile(url!,value.file,mime,setProgress);
    if(!response.ok)throw Error('Upload failed. Your file is retained; retry below.');
    value.uploaded=true;await persist(value);
   }
   setStatus('Saving this version…');const result=await complete({uploadId:value.uploadId!});
   await recovery.clear();setPending(null);setProgress(null);setStatus('Video saved.');done(result.cardId);
  }catch(e){const details=storageLimitFromError(e,quota,value.file.size);if(details){setLimit(details);setStatus('');}else{setStatus('Upload paused.');setError(message(e));}}
  finally{running.current=false;setBusy(false);}
 }
 function choose(file:File){if(quota&&file.size>quota.available){setLimit({...quota,requested:file.size});return;}void upload({file});}
 async function discard(){if(!pending||!confirm('Discard this unfinished upload? Your original file and saved videos are kept.'))return;setBusy(true);try{if(pending.uploadId)await cancel({uploadId:pending.uploadId});await recovery.clear();setPending(null);setProgress(null);setStatus('');setError('');}catch(e){setError(message(e));}finally{setBusy(false);}}
 const percent=progress?Math.min(100,Math.floor(progress.loaded/Math.max(1,progress.total)*100)):0;
 return <section className="marketing-upload" aria-label={cardId?'Revision upload':'Video upload'}><input ref={input} hidden type="file" accept="video/mp4,video/webm,video/quicktime,.mov" aria-label={cardId?'Upload revised video':'Upload marketing video'} disabled={disabled||busy||!ready} onChange={e=>{const file=e.target.files?.[0];if(file)choose(file);e.target.value='';}}/><button className="sprint-button" disabled={disabled||busy||!ready||!!pending} onClick={()=>{if(quota&&quota.available<=0)setLimit({...quota,requested:0});else input.current?.click();}}>{busy?'Uploading…':cardId?'Upload revised video':'Upload a video'}</button>{pending&&!busy&&<><button disabled={disabled} onClick={()=>void upload({...pending})}>Retry {pending.file.name}</button><button disabled={disabled} onClick={()=>void discard()}>Discard unfinished upload</button></>}{status&&<p role="status">{status}</p>}{progress&&<div className="marketing-upload-progress"><progress aria-label="Video upload progress" max={100} value={percent}/><span>{percent}% · {storageSize(progress.loaded)} / {storageSize(progress.total)}</span></div>}{error&&<p role="alert">{error}</p>}<StorageLimitDialog details={limit} close={()=>setLimit(null)} source="marketing"/></section>;
}

function videoDimensions(file:File){return new Promise<{width:number;height:number;duration:number}>((resolve,reject)=>{
 const video=document.createElement('video'),url=URL.createObjectURL(file);video.preload='metadata';
 const cleanup=()=>{clearTimeout(timer);video.onloadedmetadata=video.onerror=null;video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
 const timer=setTimeout(()=>{cleanup();reject(Error('Could not read this video. Choose an H.264 MP4, MOV or WebM.'));},15000);
 video.onloadedmetadata=()=>{const dimensions={width:video.videoWidth,height:video.videoHeight,duration:video.duration};cleanup();resolve(dimensions);};
 video.onerror=()=>{cleanup();reject(Error('This video could not be opened. Try an H.264 MP4.'));};video.src=url;
});}
