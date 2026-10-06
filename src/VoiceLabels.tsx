import {displayLabel} from './label-display';
import {useWorkspace} from './workspace';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {createVoiceSegments,type VoiceState,type VoiceSegment} from './voice-segments';
import {normalizeSpeech} from './voice-segments';
type SpeechResult={isFinal:boolean;0:{transcript:string}};
type SpeechEvent={resultIndex:number;results:ArrayLike<SpeechResult>};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:SpeechEvent)=>void)|null};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function VoiceLabels({episodeId,labels,video,active=true}:{episodeId:Id<'episodes'>;labels:string[];video:RefObject<HTMLVideoElement|null>;active?:boolean}){
 const {workspaceToken,kind}=useWorkspace();
 const save=useMutation(api.annotations.save);const objects=useQuery(api.boxes.objects,{workspaceToken,episodeId});
 const [listening,setListening]=useState(false),[heard,setHeard]=useState(''),[message,setMessage]=useState(''),[state,setState]=useState<VoiceState>({waiting:'start',start_sec:null,end_sec:null,error:null}),[failed,setFailed]=useState<VoiceSegment[]>([]);
 const [pending,setPending]=useState(0);
 const [mode,setMode]=useState<'labels'|'objects'>('labels');const modeRef=useRef(mode);
 const recognition=useRef<Recognition|null>(null),wanted=useRef(false),latestLabels=useRef(labels);
 latestLabels.current=labels;
 const persist=useRef<(segment:VoiceSegment)=>void>(()=>{});
 persist.current=segment=>{setPending(n=>n+1);void save({workspaceToken,episodeId,...segment,source:"voice"}).catch(()=>{setFailed(rows=>[...rows,segment]);setMessage('A voice segment could not save. Retry saving below.');}).finally(()=>setPending(n=>n-1));};
 const engine=useRef<ReturnType<typeof createVoiceSegments>|null>(null);
 if(!engine.current)engine.current=createVoiceSegments(segment=>persist.current(segment),setState,command=>{
  const player=video.current;if(!player)return;
  if(command==='pause'){player.pause();return;}
  void player.play().catch(()=>setMessage('The video could not start. Click the video play button, then say start again.'));
 });
 const Speech=(window as SpeechWindow).SpeechRecognition??(window as SpeechWindow).webkitSpeechRecognition;
 useEffect(()=>{
  return ()=>{wanted.current=false;const r=recognition.current;if(r){r.onend=null;r.onresult=null;r.onerror=null;r.abort();}};
 },[video]);
 useEffect(()=>{if(!active){wanted.current=false;recognition.current?.stop();setListening(false);}},[active]);
 function chooseMode(next:'labels'|'objects'){
  if(next===modeRef.current)return;
  wanted.current=false;const r=recognition.current;if(r){r.onstart=null;r.onend=null;r.onresult=null;r.onerror=null;r.abort();}recognition.current=null;
  video.current?.pause();setListening(false);setHeard('');modeRef.current=next;setMode(next);setMessage('');
 }
 function toggle(){
  if(wanted.current){wanted.current=false;recognition.current?.stop();setListening(false);setMessage('Mic off. Your marked times are kept.');return;}
  if(!Speech)return;
  const r=new Speech();recognition.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';wanted.current=true;setMessage('Allow microphone access when Chrome asks.');
  const visibilityResults=new Set<number>();
  r.onstart=()=>{visibilityResults.clear();engine.current?.beginSession();setListening(true);setMessage(modeRef.current==='labels'?'Listening. Say start, then stop, then a label.':'Listening for object visibility commands.');};
  r.onresult=event=>{
   if(!wanted.current)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const result=event.results[i];setHeard(result[0].transcript);
    const words=normalizeSpeech(result[0].transcript);
    const objectCommand=words.startsWith('select object ')||['visibility start','visibility end','object absent','needs checking','save visibility','confirm reappearance'].includes(words);
    if(modeRef.current==='labels'&&objectCommand)continue;
    if(modeRef.current==='objects'){
     if(!objectCommand)continue;
     if(result.isFinal&&!visibilityResults.has(i)){visibilityResults.add(i);window.dispatchEvent(new CustomEvent('np-visibility-voice',{detail:{episodeId,command:words}}));}continue;
    }
    const player=video.current;if(player)engine.current?.result(i,result[0].transcript,player.currentTime,result.isFinal,latestLabels.current);
   }
  };
  r.onerror=event=>{if(event.error==='no-speech')return;wanted.current=false;setListening(false);setMessage(event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone access was denied. Allow microphone access in Chrome, then try again.':event.error==='audio-capture'?'No microphone is available. Connect a microphone and try again.':event.error==='network'?'Chrome speech recognition could not connect. Check your internet connection and try again.':`Speech recognition stopped (${event.error}). Try again.`);};
  r.onend=()=>{if(wanted.current){try{r.start();}catch{wanted.current=false;setListening(false);setMessage('Listening ended. Turn the mic on to try again.');}}else setListening(false);};
  try{r.start();}catch{wanted.current=false;setMessage('The microphone could not start. Try again.');}
 }
 return <section className="voice-labels" aria-label="Voice labelling">
  <div className="voice-controls"><div className="mic-panel"><div className="mic-toggle">
   <p className="mic-state" aria-live="polite">{listening?<><span className="listening-dot" aria-hidden="true"/>Listening</>:"Mic is off"}</p>
   <button type="button" aria-pressed={listening} disabled={!Speech||(mode==='labels'?!labels.length:!objects?.length)} onClick={toggle}><svg className="mic-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>{listening?'Turn mic off':'Turn mic on'}</button>
  </div>
  <div className="voice-mode" role="group" aria-label="Microphone mode">
   <button type="button" aria-pressed={mode==='labels'} onClick={()=>chooseMode('labels')}>Label actions</button>
   <button type="button" aria-pressed={mode==='objects'} onClick={()=>chooseMode('objects')}>Annotate objects</button>
  </div></div>
  <div>{mode==='labels'?<><h3>Label a clip with your voice</h3><ol className="voice-steps"><li>Turn the mic on.</li><li>Say <strong>“start”</strong> when the action begins. The video plays.</li><li>Say <strong>“stop”</strong> when it ends. The video pauses.</li><li>Say a label below to save the clip.</li></ol><p role="status">Next, say: <strong>{state.waiting==='label'?'a label below':`“${state.waiting}”`}</strong></p></>:<><h3>Mark a missing object by voice</h3><p>First, draw and name the object using <strong>Object boxes</strong> in the tools panel.</p><ol className="voice-steps"><li>Turn the mic on. Say <strong>“select object iron”</strong>, using your object’s name.</li><li>Move the video to when it disappears. Say <strong>“visibility start”</strong>.</li><li>Move to the end of the missing or uncertain period. Say <strong>“visibility end”</strong>.</li><li>Say <strong>“object absent”</strong> if you checked, or <strong>“needs checking”</strong> if unsure. Then say <strong>“save visibility”</strong>.</li></ol><details className="voice-reappearance"><summary>When the object reappears</summary><p>Pause at the saved end time. Draw an outline of the same object in the tools panel, then verify it in <strong>Review object boxes &amp; export</strong>. Say <strong>“confirm reappearance”</strong> to reconnect it.</p></details><p>Voice marks times and visibility. Draw outlines with your mouse or touch.</p></>}
   <p aria-live="polite">Heard: <strong>{heard||'Nothing yet'}</strong></p>
  </div></div>
  {!Speech?<p>Open this page in Chrome to use the mic. You can still label by hand in the tools panel.</p>:message&&<p>{message}</p>}
  {mode==='labels'&&<>{state.start_sec!==null&&<p>Start: {state.start_sec.toFixed(3)} sec{state.end_sec!==null?` / End: ${state.end_sec.toFixed(3)} sec`:''}</p>}{state.error&&<p role="alert">{state.error}</p>}<p className="voice-label-heading">Say one of your saved labels:</p><div className="voice-label-options" aria-label="Saved labels">{labels.map(label=><span key={label}>{displayLabel(label,kind==="trial")}</span>)}</div>{!labels.length&&<p>Add labels in <strong>Your labels</strong> in the tools panel to enable the mic.</p>}<details className="voice-reappearance"><summary>Redo the marked times</summary><p>Say “start” again to replace them. Turning the mic off keeps them.</p></details></>}
  {pending>0&&<p role="status">Saving voice segment...</p>}{failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save...');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}
  <small className="voice-mode-note">Switching between actions and objects pauses the video. Turn the mic on again to continue.</small>
 </section>;
}
