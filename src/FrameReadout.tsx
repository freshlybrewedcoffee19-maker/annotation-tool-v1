import {useWorkspace} from './workspace';
import {useEffect,useState} from 'react';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
export function FrameReadout({episode,currentTime}:{episode:{_id:Id<'episodes'>;frameRate?:number|null};currentTime:number}){
 const {workspaceToken}=useWorkspace();
 const [draft,setDraft]=useState(String(episode.frameRate??'')),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const save=useMutation(api.media.setFrameRate);
 useEffect(()=>setDraft(String(episode.frameRate??'')),[episode.frameRate]);
 return <section className="frame-readout" aria-label="Frame readout"><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await save({workspaceToken,episodeId:episode._id,frameRate:draft===''?null:Number(draft)});setMessage('Frame rate saved.');}catch(error){setMessage(error instanceof Error?error.message:'Could not save frame rate.');}finally{setBusy(false);}}}><label>Frame rate (FPS)<input aria-label="Frame rate (FPS)" type="number" min="0.001" max="1000" step="any" value={draft} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy}>Save frame rate</button></form><p>Current frame: <strong>{episode.frameRate?Math.round(currentTime*episode.frameRate):'Enter frame rate'}</strong></p><span role="status">{message}</span></section>;
}
