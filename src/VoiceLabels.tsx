import {displayLabel} from './label-display';
import {useWorkspace} from './workspace';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {createVoiceSegments,type VoiceState,type VoiceSegment} from './voice-segments';
import {normalizeSpeech} from './voice-segments';
import type {Activity} from './ActivityNavigation';
import {trackProductEvent,productSaveEventId} from './product-tracking';
type SpeechResult={isFinal:boolean;0:{transcript:string}};
type SpeechEvent={resultIndex:number;results:ArrayLike<SpeechResult>};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:SpeechEvent)=>void)|null};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function VoiceLabels({episodeId,labels,video,active=true,navigate,reviewMode=false,compact=false,onToolCommand,onUnlockTools,videoOnly=false}:{videoOnly?:boolean;onUnlockTools?:()=>void;onToolCommand?:(words:string,execute:boolean)=>boolean;compact?:boolean;episodeId:Id<'episodes'>;labels:string[];video:RefObject<HTMLVideoElement|null>;active?:boolean;navigate?:(activity:Activity)=>void;reviewMode?:boolean}){
 const {workspaceToken,kind}=useWorkspace();
 const [toolsCollapsed,setToolsCollapsed]=useState(false);
 const saveLabels=useMutation(api.labels.save); const [labelSaving,setLabelSaving]=useState(false); const [labelError,setLabelError]=useState('');
 async function renameLabel(index:number,value:string,input:HTMLInputElement){const name=value.trim();if(name===labels[index])return;if(!name||labels.some((label,i)=>i!==index&&normalizeSpeech(label)===normalizeSpeech(name))){input.value=labels[index];setLabelError(name?'Each label needs a different name.':'A label cannot be empty.');return;}setLabelSaving(true);setLabelError('');try{await saveLabels({workspaceToken,episodeId,text:labels.map((label,i)=>i===index?name:label).join('\n')});}catch{input.value=labels[index];setLabelError('Could not save the label. Try again.');}finally{setLabelSaving(false);}}
 const save=useMutation(api.annotations.save);const objects=useQuery(api.boxes.objects,{workspaceToken,episodeId});
 const [listening,setListening]=useState(false),[heard,setHeard]=useState(''),[message,setMessage]=useState(''),[state,setState]=useState<VoiceState>({waiting:'start',start_sec:null,end_sec:null,error:null}),[failed,setFailed]=useState<VoiceSegment[]>([]);
 const [pending,setPending]=useState(0);
 const [mode,setMode]=useState<'labels'|'objects'>('labels');const modeRef=useRef(mode);
 const recognition=useRef<Recognition|null>(null),wanted=useRef(false),latestLabels=useRef(labels);
 const toolCommandRef=useRef(onToolCommand);toolCommandRef.current=onToolCommand;
 latestLabels.current=labels;
 useEffect(()=>{window.dispatchEvent(new CustomEvent('cv-mic-state',{detail:{listening,episodeId}}));},[listening,episodeId]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent('cv-voice-progress',{detail:{episodeId,state}}));},[state,episodeId]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent('cv-voice-saving',{detail:{episodeId,pending,failed:failed.length}}));},[episodeId,pending,failed.length]);
 useEffect(()=>{
  const report=(event:Event)=>{if((event as CustomEvent).detail.episodeId!==episodeId)return;window.dispatchEvent(new CustomEvent('cv-mic-state',{detail:{episodeId,listening}}));window.dispatchEvent(new CustomEvent('cv-voice-progress',{detail:{episodeId,state}}));window.dispatchEvent(new CustomEvent('cv-voice-saving',{detail:{episodeId,pending,failed:failed.length}}));};
  window.addEventListener('cv-voice-status-request',report);return ()=>window.removeEventListener('cv-voice-status-request',report);
 },[episodeId,listening,state,pending,failed.length]);
 const persist=useRef<(segment:VoiceSegment)=>void>(()=>{});
 persist.current=segment=>{setPending(n=>n+1);void save({workspaceToken,episodeId,...segment,source:"voice"}).then(segmentId=>{trackProductEvent({workflow:'annotation',name:'save_succeeded',eventId:productSaveEventId('annotation',segmentId),workspaceToken,episodeId,segmentId});}).catch(()=>{setFailed(rows=>[...rows,segment]);setMessage('A voice segment could not save. Retry saving below.');}).finally(()=>setPending(n=>n-1));};
 const engine=useRef<ReturnType<typeof createVoiceSegments>|null>(null);
 if(!engine.current)engine.current=createVoiceSegments(segment=>persist.current(segment),setState,command=>{
  const player=video.current;if(!player)return;
  if(command==='pause'){player.pause();return;}
  void player.play().catch(()=>setMessage('The video could not start. Click the video play button, then say start again.'));
 },true);
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
  trackProductEvent({workflow:'annotation',name:'recording_attempt',workspaceToken,episodeId});
  const r=new Speech();recognition.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';wanted.current=true;setMessage('Allow microphone access when Chrome asks.');
  const visibilityResults=new Set<number>();
  r.onstart=()=>{visibilityResults.clear();engine.current?.beginSession();setListening(true);setMessage(modeRef.current==='labels'?'Listening. Say start, then stop, then a label.':'Listening for object visibility commands.');};
  r.onresult=event=>{
   if(!wanted.current)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const result=event.results[i];setHeard(result[0].transcript);
    const words=normalizeSpeech(result[0].transcript);
    if(!reviewMode&&modeRef.current==='labels'&&engine.current?.getState().waiting==='label'&&words!=='start'&&words!=='stop'){const player=video.current;if(player)engine.current.result(i,result[0].transcript,player.currentTime,result.isFinal,latestLabels.current);continue;}
    if(toolCommandRef.current?.(words,false)){if(result.isFinal&&!visibilityResults.has(i)){visibilityResults.add(i);toolCommandRef.current(words,true);}continue;}
    const destinations:Record<string,Activity>={'open labels':'actions','open action labels':'actions','open objects':'objects','open visibility':'visibility','open relationships':'relationships','open review':'review','open export':'export','open detection':'detection','open tracking':'tracking','open masks':'masks','open team review':'team'};
    if(destinations[words]){if(result.isFinal&&!visibilityResults.has(i)){visibilityResults.add(i);navigate?.(destinations[words]);}continue;}
    const dashboardCommands=['play video','pause video','draw box','draw polygon','save labels','export csv','export json','guide me','work independently'];
    const reviewCommands=['verify','disqualify','edit annotation','undo last decision','next clip','previous clip'];
    if(dashboardCommands.includes(words)||/^go to \d+ seconds$/.test(words)||(reviewMode&&reviewCommands.includes(words))){if(result.isFinal&&!visibilityResults.has(i)){visibilityResults.add(i);if(words==='play video')void video.current?.play().catch(()=>setMessage('Click Play to start the video.'));else if(words==='pause video')video.current?.pause();else if(words.startsWith('go to ')){const seconds=Number(words.slice(6,-8));if(video.current&&seconds<=video.current.duration){video.current.pause();video.current.currentTime=seconds;}else setMessage('Choose a time inside this video.');}else window.dispatchEvent(new CustomEvent(reviewMode&&reviewCommands.includes(words)?'cv-review-command':'cv-dashboard-command',{detail:{command:words,episodeId}}));}continue;}
    if(reviewMode)continue;
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
 if(compact&&!reviewMode&&mode==='labels')return <section className="voice-labels compact-voice" aria-label="Voice labelling">
  <button type="button" aria-pressed={listening} disabled={!Speech} onClick={toggle}><svg className="mic-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>{listening?'Turn mic off':'Turn mic on'}</button>
  <div className={`trial-top-labels ${toolsCollapsed?"is-collapsed":""}`}><div className="tools-panel-header"><h2 className="trial-tools-title">Tools</h2><button type="button" className="panel-header-toggle" aria-label={toolsCollapsed?"Expand Tools panel":"Collapse Tools panel"} aria-expanded={!toolsCollapsed} onClick={()=>setToolsCollapsed(v=>!v)}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={toolsCollapsed?"m13 9 3 3-3 3":"m16 9-3 3 3 3"}/></svg></button></div><nav className="collapsed-tool-rail" aria-label="Tools"><button type="button" className={!toolsCollapsed?"is-active":""} aria-pressed={!toolsCollapsed} onClick={()=>setToolsCollapsed(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg><span>Annotation</span></button>{!videoOnly&&<button type="button" onClick={onUnlockTools}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg><span>More tools</span></button>}</nav><details className="trial-annotation-tool" open><summary>Annotation tool</summary><h3>Your labels</h3>{!labels.length&&<p>Labels appear as you annotate.</p>}{labelError&&<p role="alert">{labelError}</p>}<div className="voice-label-options" aria-label="Saved labels">{labels.map((label,index)=><input key={label} aria-label={`Edit label ${index+1}`} defaultValue={label} disabled={labelSaving} onBlur={event=>void renameLabel(index,event.currentTarget.value,event.currentTarget)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}if(event.key==='Escape'){event.currentTarget.value=label;event.currentTarget.blur();}}}/>)}</div></details>{!videoOnly&&<button type="button" className="trial-panel-unlock" onClick={onUnlockTools}>Unlock More Tools</button>}</div>
  {!Speech&&<p role="alert">Open in Chrome to use the mic, or use the manual video controls.</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {message&&!['Mic off. Your marked times are kept.','Allow microphone access when Chrome asks.','Listening. Say start, then stop, then a label.','Retrying save...'].includes(message)&&<p role="alert">{message}</p>}
  {pending>0&&<p role="status">Saving…</p>}
  {failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save...');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}
 </section>;
 return <section className="voice-labels" aria-label="Voice labelling">
  <div className="voice-controls"><div className="mic-panel"><div className="mic-toggle">
   <p className="mic-state" aria-live="polite">{listening?<><span className="listening-dot" aria-hidden="true"/>Listening</>:"Mic is off"}</p>
   <button type="button" aria-pressed={listening} disabled={!Speech||(!reviewMode&&(mode==='labels'?false:!objects?.length))} onClick={toggle}><svg className="mic-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>{listening?'Turn mic off':'Turn mic on'}</button>
  </div>
  {!reviewMode&&!videoOnly&&<div className="voice-mode" role="group" aria-label="Microphone mode">
   <button type="button" aria-pressed={mode==='labels'} onClick={()=>chooseMode('labels')}>Label actions</button>
   <button type="button" aria-pressed={mode==='objects'} onClick={()=>chooseMode('objects')}>Annotate objects</button>
  </div>}</div>
  <div>{reviewMode?<><h3>Review by voice</h3><p>Watch, then say <strong>“verify”</strong>, <strong>“disqualify”</strong> or <strong>“edit annotation”</strong>.</p><p>Say <strong>“undo last decision”</strong> to recover a mistake.</p></>:mode==='labels'?<><h3>Label a clip with your voice</h3><p>Say <strong>“start”</strong>, <strong>“stop”</strong>, then any label.</p><p role="status">Next, say: <strong>{state.waiting==='label'?'any label':`“${state.waiting}”`}</strong></p></>:<><h3>Mark a missing object by voice</h3><p>First, draw and name the object using <strong>Object boxes</strong> in the tools panel.</p><ol className="voice-steps"><li>Turn the mic on. Say <strong>“select object iron”</strong>, using your object’s name.</li><li>Move the video to when it disappears. Say <strong>“visibility start”</strong>.</li><li>Move to the end of the missing or uncertain period. Say <strong>“visibility end”</strong>.</li><li>Say <strong>“object absent”</strong> if you checked, or <strong>“needs checking”</strong> if unsure. Then say <strong>“save visibility”</strong>.</li></ol><details className="voice-reappearance"><summary>When the object reappears</summary><p>Pause at the saved end time. Draw an outline of the same object in the tools panel, then verify it in <strong>Review object boxes &amp; export</strong>. Say <strong>“confirm reappearance”</strong> to reconnect it.</p></details><p>Voice marks times and visibility. Draw outlines with your mouse or touch.</p></>}
   <p aria-live="polite">Heard: <strong>{heard||'Nothing yet'}</strong></p>
  </div></div>
  {!Speech?<p>Open this page in Chrome to use the mic. You can still label by hand in the tools panel.</p>:message&&<p>{message}</p>}
  {!reviewMode&&mode==='labels'&&<>{state.start_sec!==null&&<p>Start: {state.start_sec.toFixed(3)} sec{state.end_sec!==null?` / End: ${state.end_sec.toFixed(3)} sec`:''}</p>}{state.error&&<p role="alert">{state.error}</p>}<p className="voice-label-heading">Your labels:</p><div className="voice-label-options" aria-label="Saved labels">{labels.map(label=><span key={label}>{displayLabel(label,kind==="trial")}</span>)}</div>{!labels.length&&<p>Say any label after marking a segment.</p>}<details className="voice-reappearance"><summary>Redo the marked times</summary><p>Say “start” again to replace them. Turning the mic off keeps them.</p></details></>}
  {pending>0&&<p role="status">Saving voice segment...</p>}{failed.length>0&&<button type="button" onClick={()=>{const rows=failed;setFailed([]);setMessage('Retrying save...');rows.forEach(segment=>persist.current(segment));}}>Retry saving {failed.length} voice segment(s)</button>}
  {videoOnly?<details className="voice-navigation-help"><summary>Talk to your dashboard</summary><p>“Open labels”, “open review”, “open export”, “play video”, “pause video”, “go to 12 seconds”.</p><p>“Export CSV” or “export JSON” downloads your saved video annotations.</p></details>:<><details className="voice-navigation-help"><summary>Talk to your dashboard</summary><p>“Open objects”, “open visibility”, “open relationships”, “open review”, “open export”, “play video”, “pause video”, “go to 12 seconds”, “guide me”, “work independently”.</p><p>In Objects: “draw box” or “draw polygon” selects the tool; draw the outline yourself. “Export CSV” or “export JSON” downloads your saved action annotations.</p></details><small className="voice-mode-note">Switching between actions and objects pauses the video. Turn the mic on again to continue.</small></>}
 </section>;
}
