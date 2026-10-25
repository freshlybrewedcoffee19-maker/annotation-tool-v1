import {useEffect,useId,useRef,useState} from 'react';
import './segment-editor.css';

type Values={label:string;start_sec:number;end_sec:number};
type Props={
 segment:Values;source:string|null;duration:number;locked:boolean;
 save:(values:Values)=>Promise<unknown>;close:()=>void;
};

// Corrections use their own draft and muted preview. The annotation player and
// microphone remain mounted; nothing is persisted until Save changes succeeds.
export function SegmentEditor({segment,source,duration,locked,save,close}:Props){
 const dialog=useRef<HTMLDialogElement>(null),preview=useRef<HTMLVideoElement>(null);
 const title=useId(),help=useId(),labelId=useId(),startId=useId(),endId=useId();
 const [label,setLabel]=useState(segment.label),[start,setStart]=useState(String(segment.start_sec)),[end,setEnd]=useState(String(segment.end_sec));
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[attempted,setAttempted]=useState(false),[ready,setReady]=useState(false),[position,setPosition]=useState(segment.start_sec);
 const submitting=useRef(false),previewing=useRef(false),endAt=useRef(segment.end_sec);
 const from=Number(start),to=Number(end);
 const labelError=label.trim()?'':'Enter a label.';
 const startError=start.trim()!==''&&Number.isFinite(from)&&from>=0&&from<duration?'':'Start must be inside the video.';
 const endError=end.trim()!==''&&Number.isFinite(to)&&to>from&&to<=duration?'':'End must be after start and within the video.';
 const invalid=labelError||startError||endError;
 endAt.current=to;

 useEffect(()=>{
  const node=dialog.current!,opener=document.activeElement;
  node.showModal();
  return()=>{node.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});};
 },[]);
 function boundary(which:'start'|'end',value:string){previewing.current=false;setError('');(which==='start'?setStart:setEnd)(value);}
 function nudge(which:'start'|'end',delta:number){
  const value=Number(which==='start'?start:end);
  boundary(which,Math.max(0,Math.min(duration,(Number.isFinite(value)?value:0)+delta)).toFixed(3));
 }
 async function playClip(){
  setAttempted(true);setError('');if(invalid||!preview.current)return;
  const player=preview.current;player.pause();player.currentTime=from;previewing.current=true;
  try{await player.play();}catch{previewing.current=false;setError('The preview could not play. Try the video Play button.');}
 }
 async function submit(){
  if(submitting.current||locked)return;setAttempted(true);setError('');if(invalid)return;
  submitting.current=true;setSaving(true);preview.current?.pause();
  try{await save({label:label.trim(),start_sec:from,end_sec:to});}
  catch(e){setError(e instanceof Error?e.message:'Changes could not save. Your draft is still here; try again.');}
  finally{submitting.current=false;setSaving(false);}
 }
 return <dialog ref={dialog} className="segment-editor" aria-labelledby={title} aria-describedby={help}
  onCancel={event=>{event.preventDefault();if(!submitting.current)close();}}>
  <div className="segment-editor-heading"><h2 id={title}>Edit annotation</h2><p id={help}>Adjust this clip’s label and times. Other annotations stay unchanged.</p></div>
  <div className="segment-editor-content">
   <div className="segment-editor-preview">
    {source?<video ref={preview} src={source} aria-label="Annotation correction preview" controls muted playsInline preload="metadata"
     onLoadedMetadata={()=>{const player=preview.current!;player.currentTime=Math.min(segment.start_sec,player.duration);setReady(true);}}
     onTimeUpdate={()=>{const player=preview.current!;setPosition(player.currentTime);if(previewing.current&&player.currentTime>=endAt.current){previewing.current=false;player.pause();player.currentTime=endAt.current;}}}
     onSeeking={()=>{const player=preview.current!;if(player.currentTime<from||player.currentTime>to)previewing.current=false;}}
     onPause={()=>{if(preview.current?.paused)previewing.current=false;}}
     onError={()=>{setReady(false);setError('Video preview is unavailable. You can still edit the label and times.');}}/>:<p>Video preview is unavailable. You can still edit the label and times.</p>}
    <div className="segment-editor-preview-actions"><button type="button" disabled={!ready||saving} onClick={()=>void playClip()}>Preview clip</button><span aria-live="off">{position.toFixed(3)} sec</span></div>
   </div>
   <form noValidate onSubmit={event=>{event.preventDefault();void submit();}} aria-busy={saving}>
    <label htmlFor={labelId}>Label</label><input id={labelId} autoFocus value={label} disabled={saving} onChange={event=>{setLabel(event.target.value);setError('');}} aria-invalid={attempted&&!!labelError}/>
    {(['start','end'] as const).map(which=><div className="segment-editor-boundary" key={which}>
     <label htmlFor={which==='start'?startId:endId}>{which==='start'?'Start':'End'} (seconds)</label>
     <input id={which==='start'?startId:endId} type="number" inputMode="decimal" step="0.001" min="0" max={duration} value={which==='start'?start:end} disabled={saving}
      onChange={event=>boundary(which,event.target.value)} aria-invalid={attempted&&!!(which==='start'?startError:endError)}/>
     <div className="segment-editor-adjustments">
      <button type="button" aria-label={`${which==='start'?'Start':'End'} earlier by 0.1 seconds`} disabled={saving} onClick={()=>nudge(which,-.1)}>−0.1s</button>
      <button type="button" aria-label={`${which==='start'?'Start':'End'} later by 0.1 seconds`} disabled={saving} onClick={()=>nudge(which,.1)}>+0.1s</button>
      <button type="button" aria-label={`Use current position for ${which}`} disabled={!ready||saving} onClick={()=>boundary(which,(preview.current?.currentTime??0).toFixed(3))}>Use current position</button>
     </div>
    </div>)}
    <p className="segment-editor-duration">{!startError&&!endError?`${(to-from).toFixed(3)} sec clip`:`Video duration: ${duration.toFixed(3)} sec`}</p>
    {locked&&<p role="alert">Someone else is editing this video. Keep this draft open and try saving when they finish.</p>}
    {(error||attempted&&invalid)&&<p role="alert" className="segment-editor-error">{error||invalid}</p>}
    <div className="segment-editor-actions"><button type="submit" className="segment-editor-save" disabled={saving||locked}>{saving?'Saving…':'Save changes'}</button><button type="button" disabled={saving} onClick={close}>Cancel edit</button></div>
   </form>
  </div>
 </dialog>;
}
