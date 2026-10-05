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
  <div>{mode==='labels'?<><p>Commands: <strong>start</strong> plays and marks the start; <strong>stop</strong> pauses and marks the end; <strong>a saved label</strong> saves the segment.</p><p role="status">Waiting for: <strong>{state.waiting==='label'?'a label':state.waiting}</strong></p></>:<><p>Commands: <strong>select object iron</strong> (use your saved name), <strong>visibility start</strong>, <strong>visibility end</strong>, <strong>object absent</strong> or <strong>needs checking</strong>, then <strong>save visibility</strong>.</p><p>After verifying its outline at the span end, say <strong>confirm reappearance</strong>.</p></>}
   <p aria-live="polite">Heard: <strong>{heard||'Nothing yet'}</strong></p>
  </div></div>
  <p>{Speech?(message||(mode==='labels'?'Turn on the mic. Say start to play, stop to pause, then a label to save.':objects?.length?'Turn on the mic to mark object visibility. Open Object visibility & reappearance below the video to see your saved decisions.':'Draw a named object first, then turn on the mic.')):'Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.'}</p>
  {mode==='labels'&&<>{state.start_sec!==null&&<p>Start: {state.start_sec.toFixed(3)} sec{state.end_sec!==null?` / End: ${state.end_sec.toFixed(3)} sec`:''}</p>}{state.error&&<p role="alert">{state.error}</p>}<div className="voice-label-options" aria-label="Saved labels">{labels.map(label=><span key={label}>{displayLabel(label,kind==="trial")}</span>)}</div><small>Say start again to replace the marked times. Turning the mic off keeps them.</small></>}
  {pending>0&&<p role="status">Saving voice segment...</p>}{failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save...');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}
  <small className="voice-mode-note">Changing mode pauses the video and turns the mic off. Turn it on when you’re ready.</small>
 </section>;
}
