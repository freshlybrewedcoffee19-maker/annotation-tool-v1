import {useEffect,useId,useRef,useState} from 'react';
import {useConvexAuth,useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {storageSize,type StorageLimitDetails} from './storage-quota';
import './storage-limit.css';

export function StorageLimitDialog({details,close,source='annotation'}:{details:StorageLimitDetails|null;close:()=>void;source?:'marketing'|'annotation'}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId(),description=useId();
 const {isAuthenticated,isLoading}=useConvexAuth(),profile=useQuery(api.accounts.me,details&&isAuthenticated?{}:'skip'),request=useMutation(api.storageRequests.request);
 const [submission,setSubmission]=useState<{id:Id<'storageRequests'>;email:string;status:string;retryAt:number|null}|null>(null),[sending,setSending]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now);
 const progress=useQuery(api.storageRequests.status,details&&submission&&profile?.email===submission.email?{requestId:submission.id}:'skip');
 const state=progress?.status??(submission?.email===profile?.email?submission?.status:undefined),pending=state==='queued'||state==='sending',sent=state==='sent';
 const retryAt=progress?.retryAt??submission?.retryAt,waitingToRetry=state==='failed'&&!!retryAt&&retryAt>now;
 useEffect(()=>{if(!details||!waitingToRetry)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[details,waitingToRetry]);
 async function sendRequest(){if(!details||!profile?.email||sending)return;setSending(true);setError('');try{const result=await request({source,requestedBytes:details.requested});setSubmission({id:result.requestId,email:profile.email,status:result.status,retryAt:result.retryAt});}catch{setError('Could not save your request. Please try again.');}finally{setSending(false);}}
 useEffect(()=>{if(details&&!dialog.current?.open)dialog.current?.showModal();else if(!details&&dialog.current?.open)dialog.current.close();},[details]);
 return <dialog ref={dialog} className="storage-limit-dialog" aria-labelledby={title} aria-describedby={description} onClose={close}>
  <button type="button" className="storage-limit-close" aria-label="Close storage notice" onClick={close}>×</button>
  <p className="storage-limit-kicker">FREE STORAGE</p>
  <h2 id={title}>Your free storage is 1 GB.</h2>
  {details&&<>
   <p id={description}>{details.owner?'This upload would exceed your account’s free storage.':'This upload would exceed the project owner’s free storage.'} Videos and revisions share this allowance with your other saved files.</p>
   <div className="storage-limit-usage"><span>{storageSize(details.stored)} stored</span><span>1 GB free</span><meter min={0} max={details.storageLimit} value={Math.min(details.storageLimit,details.stored+details.reserved)} aria-label="Account storage used"/>{details.reserved>0&&<small>{storageSize(details.reserved)} reserved for unfinished uploads</small>}{details.requested>0&&<small>This file needs {storageSize(details.requested)} · {storageSize(details.available)} available</small>}</div>
   <p>Storage above 1 GB costs <strong>$0.020 per extra GB per month.</strong> {details.owner?'Request more storage below.':'Ask the project owner to arrange more storage.'}</p>
   <p className="storage-limit-note">Your saved videos and feedback are still available.</p>
   {details.owner&&<div className="storage-request-details">{profile?.email?<><p>We’ll email your name, account email and storage usage to <strong>riya.shah@cheddarvox.com</strong>.</p><p className="storage-limit-note">Requesting as {profile.email}. We’ll reply to this address.</p></>:<p className="storage-limit-note">{isLoading||isAuthenticated?'Getting your account details…':'Sign in to request more storage with your account details.'}</p>}</div>}
   {pending&&<p className="storage-request-status" role="status">Your request is saved. Sending the email…</p>}
   {sent&&<p className="storage-request-status" role="status">Request emailed. We’ll reply to {profile?.email}.</p>}
   {state==='failed'&&<p className="storage-request-error" role="alert">Your request is saved, but the email could not be sent. {waitingToRetry?`Please retry after ${new Date(retryAt!).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}.`:'Please retry.'}</p>}
   {error&&<p className="storage-request-error" role="alert">{error}</p>}
   <div className="storage-limit-actions">{details.owner&&(isAuthenticated?<button className="storage-request-send" type="button" disabled={!profile?.email||sending||pending||sent||waitingToRetry} onClick={()=>void sendRequest()}>{sent?'Request sent':sending||pending?'Sending request…':state==='failed'?'Retry request':'Request more storage'}</button>:<a href={source==='marketing'?'/video-feedback/signin?returnTo=%2Fvideo-feedback%2Fworkspace':'/workspace'}>Sign in to request storage</a>)}<button type="button" onClick={close}>Back to my videos</button></div>
  </>}
 </dialog>;
}
