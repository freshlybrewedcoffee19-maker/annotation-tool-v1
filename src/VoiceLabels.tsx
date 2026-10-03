import {useEffect,useRef,useState,type RefObject} from 'react';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {createVoiceSegments,type VoiceState,type VoiceSegment} from './voice-segments';
type SpeechResult={isFinal:boolean;0:{transcript:string}};
type SpeechEvent={resultIndex:number;results:ArrayLike<SpeechResult>};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:SpeechEvent)=>void)|null};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function VoiceLabels({episodeId,labels,video,active=true}:{episodeId:Id<'episodes'>;labels:string[];video:RefObject<HTMLVideoElement|null>;active?:boolean}){
 const save=useMutation(api.annotations.save);
 const [listening,setListening]=useState(false),[heard,setHeard]=useState(''),[message,setMessage]=useState(''),[state,setState]=useState<VoiceState>({waiting:'start',start_sec:null,end_sec:null,error:null}),[failed,setFailed]=useState<VoiceSegment[]>([]);
 const [pending,setPending]=useState(0);
 const recognition=useRef<Recognition|null>(null),wanted=useRef(false),latestLabels=useRef(labels);
 latestLabels.current=labels;
 const persist=useRef<(segment:VoiceSegment)=>void>(()=>{});
 persist.current=segment=>{setPending(n=>n+1);void save({episodeId,...segment,source:"voice"}).catch(()=>{setFailed(rows=>[...rows,segment]);setMessage('A voice segment could not save. Retry saving below.');}).finally(()=>setPending(n=>n-1));};
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
 function toggle(){
  if(wanted.current){wanted.current=false;recognition.current?.stop();setListening(false);setMessage('Mic off. Your marked times are kept.');return;}
  if(!Speech)return;
  const r=new Speech();recognition.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';wanted.current=true;setMessage('Allow microphone access when Chrome asks.');
  r.onstart=()=>{engine.current?.beginSession();setListening(true);setMessage('Listening. Say start, then stop, then a label.');};
  r.onresult=event=>{
   if(!wanted.current)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const result=event.results[i];setHeard(result[0].transcript);
    const player=video.current;if(player)engine.current?.result(i,result[0].transcript,player.currentTime,result.isFinal,latestLabels.current);
   }
  };
  r.onerror=event=>{if(event.error==='no-speech')return;wanted.current=false;setListening(false);setMessage(event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone access was denied. Allow microphone access in Chrome, then try again.':event.error==='audio-capture'?'No microphone is available. Connect a microphone and try again.':event.error==='network'?'Chrome speech recognition could not connect. Check your internet connection and try again.':`Speech recognition stopped (${event.error}). Try again.`);};
  r.onend=()=>{if(wanted.current){try{r.start();}catch{wanted.current=false;setListening(false);setMessage('Listening ended. Turn the mic on to try again.');}}else setListening(false);};
  try{r.start();}catch{wanted.current=false;setMessage('The microphone could not start. Try again.');}
 }
 return <section className="voice-labels" aria-label="Voice labelling"><div className="voice-controls"><div className="mic-toggle"><p className="mic-state" aria-live="polite">{listening?<><span className="listening-dot" aria-hidden="true"/>Listening</>:"Mic is off"}</p><button type="button" aria-pressed={listening} disabled={!Speech||!labels.length} onClick={toggle}>{listening?'Turn mic off':'Turn mic on'}</button></div><div><p>Commands: <strong>start</strong> plays and marks the start; <strong>stop</strong> pauses and marks the end; <strong>a saved label</strong> saves the segment.</p><p aria-live="polite">Heard: <strong>{heard||'Nothing yet'}</strong></p><p role="status">Waiting for: <strong>{state.waiting==='label'?'a label':state.waiting}</strong></p></div></div><p>{Speech?(message||'Turn on the mic. Say start to play, stop to pause, then a label to save.'): 'Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.'}</p>{state.start_sec!==null&&<p>Start: {state.start_sec.toFixed(3)} sec{state.end_sec!==null?` / End: ${state.end_sec.toFixed(3)} sec`:''}</p>}{state.error&&<p role="alert">{state.error}</p>}{pending>0&&<p role="status">Saving voice segment...</p>}{failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save...');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}<small>Say start again to replace the marked times. Turning the mic off keeps them.</small></section>;
}
