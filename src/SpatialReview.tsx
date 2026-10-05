import {useState,type RefObject} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {useWorkspace} from './workspace';

export function SpatialReview({episodeId,video}:{episodeId:Id<'episodes'>;video:RefObject<HTMLVideoElement|null>}){
 const {workspaceToken}=useWorkspace();
 const boxes=useQuery(api.boxes.list,{workspaceToken,episodeId});
 const review=useMutation(api.boxes.review);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function decide(boxId:string,status:'pending'|'verified'|'disqualified'){
  setBusy(true);setError('');try{await review({workspaceToken,episodeId,boxId,status});}catch(e){setError(e instanceof Error?e.message:'Review could not save. Try again.');}finally{setBusy(false);}
 }
 function download(){
  const data={format:'naive-physics-spatial',version:1,episodeId,coordinateSpace:'normalized-video',annotations:(boxes??[]).filter(b=>b.reviewStatus!=='disqualified').map(b=>({...b,shape:b.points?'polygon':'box',reviewStatus:b.reviewStatus??'pending',source:'manual'}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='object-annotations.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <details className="spatial-review"><summary>Review object boxes &amp; export</summary><p>Check each box on its saved frame. Disqualified boxes stay recoverable and are excluded from this export. Editing geometry requires a fresh review.</p>
 <button disabled={boxes===undefined||busy} onClick={download}>Export object JSON</button>
 {boxes===undefined?<p role="status">Loading object review…</p>:!boxes.length?<p>Draw an object box to begin review.</p>:<ul aria-label="Object review">{boxes.map(b=><li key={b.id}><button disabled={busy} onClick={()=>{if(video.current){video.current.pause();video.current.currentTime=b.time;}}}>{b.name} · {b.time.toFixed(3)} sec · {b.objectId.slice(0,8)}</button><span aria-label={`Review status ${b.id}`}>{b.reviewStatus??'pending'}</span><button disabled={busy} onClick={()=>void decide(b.id,'verified')}>Verify box</button><button disabled={busy} onClick={()=>void decide(b.id,'disqualified')}>Disqualify box</button><button disabled={busy} onClick={()=>void decide(b.id,'pending')}>Restore to pending</button></li>)}</ul>}
 {busy&&<p role="status">Saving object review…</p>}{error&&<p role="alert">{error}</p>}</details>;
}
