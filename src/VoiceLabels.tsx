import {useEffect,useRef,useState,type RefObject} from 'react';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {createVoiceSegments,type OpenVoiceSegment,type VoiceSegment} from './voice-segments';
type SpeechResult={isFinal:boolean;0:{transcript:string}};
type SpeechEvent={resultIndex:number;results:ArrayLike<SpeechResult>};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:SpeechEvent)=>void)|null};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function VoiceLabels({episodeId,labels,video}:{episodeId:Id<'episodes'>;labels:string[];video:RefObject<HTMLVideoElement|null>}){
 const save=useMutation(api.annotations.save);
 const [listening,setListening]=useState(false),[heard,setHeard]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState<OpenVoiceSegment|null>(null),[failed,setFailed]=useState<VoiceSegment[]>([]);
 const [pending,setPending]=useState(0);
 const recognition=useRef<Recognition|null>(null),wanted=useRef(false),latestLabels=useRef(labels),lastTime=useRef(0);
 latestLabels.current=labels;
 const persist=useRef<(segment:VoiceSegment)=>void>(()=>{});
 persist.current=segment=>{setPending(n=>n+1);void save({episodeId,...segment}).catch(()=>{setFailed(rows=>[...rows,segment]);setMessage('A voice segment could not save. Retry saving below.');}).finally(()=>setPending(n=>n-1));};
 const engine=useRef<ReturnType<typeof createVoiceSegments>|null>(null);
 if(!engine.current)engine.current=createVoiceSegments(segment=>persist.current(segment),setOpen);
 const Speech=(window as SpeechWindow).SpeechRecognition??(window as SpeechWindow).webkitSpeechRecognition;
 useEffect(()=>{
  const player=video.current;
  const update=()=>{lastTime.current=player?.currentTime??lastTime.current;};
  const ended=()=>{update();engine.current?.finish(lastTime.current);};
  player?.addEventListener('timeupdate',update);player?.addEventListener('ended',ended);
  return ()=>{wanted.current=false;const r=recognition.current;if(r){r.onend=null;r.onresult=null;r.onerror=null;r.abort();}engine.current?.finish(lastTime.current);player?.removeEventListener('timeupdate',update);player?.removeEventListener('ended',ended);};
 },[video]);
 function toggle(){
  if(wanted.current){wanted.current=false;recognition.current?.stop();setListening(false);engine.current?.finish(video.current?.currentTime??lastTime.current);return;}
  if(!Speech)return;
  const r=new Speech();recognition.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';wanted.current=true;setMessage('Allow microphone access when Chrome asks.');
  r.onstart=()=>{setListening(true);setMessage('Listening. Say a saved label, then “stop” or another label.');};
  r.onresult=event=>{
   if(!wanted.current)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const result=event.results[i];setHeard(result[0].transcript);
    if(result.isFinal){const player=video.current;const time=player?.currentTime??0;lastTime.current=time;engine.current?.hear(result[0].transcript,time,!!player&&!player.paused&&!player.ended,latestLabels.current);}
   }
  };
  r.onerror=event=>{if(event.error==='no-speech')return;wanted.current=false;setListening(false);engine.current?.finish(video.current?.currentTime??lastTime.current);setMessage(event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone access was denied. Allow microphone access in Chrome, then try again.':event.error==='audio-capture'?'No microphone is available. Connect a microphone and try again.':event.error==='network'?'Chrome speech recognition could not connect. Check your internet connection and try again.':`Speech recognition stopped (${event.error}). Try again.`);};
  r.onend=()=>{if(wanted.current){try{r.start();}catch{wanted.current=false;setListening(false);engine.current?.finish(video.current?.currentTime??lastTime.current);setMessage('Listening ended. Turn the mic on to try again.');}}else setListening(false);};
  try{r.start();}catch{wanted.current=false;setMessage('The microphone could not start. Try again.');}
 }
 return <section className="voice-labels" aria-label="Voice labelling"><div className="voice-controls"><button type="button" aria-pressed={listening} disabled={!Speech||!labels.length} onClick={toggle}>{listening?'Mic off':'Mic on'}</button><span>{Speech?(message||'Play the video, turn on the mic, then say one of your labels.'): 'Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.'}</span></div><p aria-live="polite">Heard: <strong>{heard||'—'}</strong></p>{open&&<p>Open segment: <strong>{open.label}</strong> from {open.start_sec.toFixed(3)} sec</p>}{pending>0&&<p role="status">Saving voice segment…</p>}{failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save…');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}<small>“Stop” ends a segment. Turning the mic off also ends the open segment. Commands start segments only while the video plays.</small></section>;
}
