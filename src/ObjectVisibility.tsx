import {useState,useEffect,useRef,type RefObject} from 'react';
import {useQuery,useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Doc,Id} from '../convex/_generated/dataModel';
import {useWorkspace} from './workspace';
import {normalizeSpeech} from './voice-segments';
export function ObjectVisibility({episodeId,video}:{episodeId:Id<'episodes'>;video:RefObject<HTMLVideoElement|null>}){
 const {workspaceToken}=useWorkspace(),args={workspaceToken,episodeId};const objects=useQuery(api.boxes.objects,args),spans=useQuery(api.visibility.list,args),shapes=useQuery(api.boxes.list,args);const save=useMutation(api.visibility.save),remove=useMutation(api.visibility.remove);
 const [object,setObject]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[state,setState]=useState<'absent'|'needs_checking'>('needs_checking'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [removed,setRemoved]=useState<Doc<'objectVisibility'>['spans'][number]|null>(null);
 const selected=object||objects?.[0]?.objectId||'';
 async function act(f:()=>Promise<unknown>){setBusy(true);setError('');setMessage('');try{await f();setMessage('Visibility saved.');}catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.');}finally{setBusy(false);}}
 const voice=useRef<(command:string)=>void>(()=>{}),saving=useRef(false);
 voice.current=command=>{
  if(busy||saving.current){setError('Wait for the current save to finish.');return;}
  if(command.startsWith('select object ')){const name=command.slice(14);const matches=objects?.filter(o=>normalizeSpeech(o.name)===name)??[];if(matches.length!==1){setError('That object name is missing or shared by several objects. Choose its identity in the list.');return;}setObject(matches[0].objectId);setError('');setMessage(`${matches[0].name} selected.`);return;}
  if(command==='visibility start'){setStart((video.current?.currentTime??0).toFixed(3));setMessage('Visibility start marked.');return;}
  if(command==='visibility end'){video.current?.pause();setEnd((video.current?.currentTime??0).toFixed(3));setMessage('Visibility end marked.');return;}
  if(command==='object absent'||command==='needs checking'){setState(command==='object absent'?'absent':'needs_checking');setMessage(command==='object absent'?'Absent selected.':'Needs checking selected.');return;}
  const run=async()=>{
   if(command==='save visibility'){if(!selected||start===''||end==='')throw new Error('Choose an object and mark both visibility boundaries first.');await save({...args,span:{id:crypto.randomUUID(),objectId:selected,start:Number(start),end:Number(end),state}});return;}
   const time=video.current?.currentTime??0;
   const candidates=spans?.filter(s=>s.objectId===selected&&Math.abs(s.end-time)<.001&&!s.reappearanceBoxId)??[];
   if(candidates.length!==1)throw new Error('Select the object and pause at its visibility span end first.');
   const outlines=shapes?.filter(b=>b.objectId===selected&&Math.abs(b.time-candidates[0].end)<.0005&&b.reviewStatus==='verified')??[];
   if(outlines.length!==1)throw new Error('Draw and verify one outline of the same object at this time first.');
   await save({...args,span:{...candidates[0],reappearanceBoxId:outlines[0].id}});
  };saving.current=true;void act(run).finally(()=>{saving.current=false;});
 };
 useEffect(()=>{const hear=(e:Event)=>{const d=(e as CustomEvent<{episodeId:string;command:string}>).detail;if(d.episodeId===episodeId)voice.current(d.command);};window.addEventListener('np-visibility-voice',hear);return()=>window.removeEventListener('np-visibility-voice',hear);},[episodeId]);
 return <details className="action-objects"><summary>Object visibility & reappearance</summary><p>Mark when an object is missing or uncertain. These are your decisions, not automatic tracking. To reconnect it, draw and verify an outline of the same object at the end time.</p>
 <p>Turn on the main mic. Say <strong>select object iron</strong> (use your saved name), <strong>visibility start</strong>, <strong>visibility end</strong>, <strong>object absent</strong> or <strong>needs checking</strong>, then <strong>save visibility</strong>. At the span end, after verifying its outline, say <strong>confirm reappearance</strong>. If names repeat, choose the identity below. Drawing the outline still uses the pointer.</p>
 <form onSubmit={e=>{e.preventDefault();void act(()=>save({...args,span:{id:crypto.randomUUID(),objectId:selected,start:Number(start),end:Number(end),state}}));}}><fieldset disabled={busy||!objects?.length||spans===undefined}><legend>Mark a visibility span</legend><label>Object<select aria-label="Visibility object" value={selected} onChange={e=>setObject(e.target.value)}>{objects?.map(o=><option key={o.objectId} value={o.objectId}>{o.name} · {o.objectId.slice(0,8)}</option>)}</select></label><label>Start seconds<input aria-label="Visibility start" type="number" required min="0" step="0.001" value={start} onChange={e=>setStart(e.target.value)}/></label><button type="button" onClick={()=>setStart((video.current?.currentTime??0).toFixed(3))}>Use current time for visibility start</button><label>End seconds<input aria-label="Visibility end" type="number" required min="0" step="0.001" value={end} onChange={e=>setEnd(e.target.value)}/></label><button type="button" onClick={()=>setEnd((video.current?.currentTime??0).toFixed(3))}>Use current time for visibility end</button><label>Visibility<select aria-label="Visibility state" value={state} onChange={e=>setState(e.target.value as typeof state)}><option value="needs_checking">Needs checking</option><option value="absent">Absent — I checked</option></select></label><button>Save visibility span</button></fieldset></form>
 {!objects?.length&&<p>Draw a named object first.</p>}
 <ul aria-label="Saved visibility spans">{spans?.map(s=>{const b=shapes?.find(b=>b.id===s.reappearanceBoxId&&b.objectId===s.objectId&&Math.abs(b.time-s.end)<.0005&&b.reviewStatus==='verified');const candidates=shapes?.filter(b=>b.objectId===s.objectId&&Math.abs(b.time-s.end)<.0005&&b.reviewStatus==='verified');return <li key={s.id}>{objects?.find(o=>o.objectId===s.objectId)?.name} · {s.start}–{s.end} sec · {s.state==='absent'?'Absent':'Needs checking'} · {b?'Reappearance confirmed at end':'Reappearance needs checking'} <button disabled={busy} onClick={()=>{if(video.current){video.current.pause();video.current.currentTime=s.end;}}}>View span end</button>{!b&&candidates?.map(b=><button key={b.id} disabled={busy} onClick={()=>void act(()=>save({...args,span:{...s,reappearanceBoxId:b.id}}))}>Confirm same object reappears at {s.end} sec</button>)}<button disabled={busy} onClick={()=>void act(async()=>{await remove({...args,id:s.id});setRemoved(s);})}>Remove visibility span</button></li>;})}</ul>{removed&&<button disabled={busy} onClick={()=>void act(async()=>{const {reappearanceBoxId,...span}=removed;await save({...args,span});setRemoved(null);})}>Undo visibility removal</button>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </details>;
}

