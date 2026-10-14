import {useEffect,useId,useRef,useState,type RefObject,type ReactNode} from 'react';
import {useQuery,useSample} from './hooks';
import {api} from '../../convex/_generated/api';
import {readDraft,type FeedbackDraft} from './drafts';
import {message,type Version} from './types';
import {FeedbackCommands,playbackCommand,playMarkedVideo,type CommandTime} from './voice-commands';
import {MarketingSpeechSession,watchVoiceVisibility,type Recognition,type VoiceState} from './voice-session';
import {MarketingMicrophone} from './pcm';
import {useFeedbackQueue} from './use-feedback-queue';
import type {FeedbackJob} from './feedback-queue';
import {FeedbackAutosave} from './feedback-autosave';

type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
const blank=():FeedbackDraft=>({start:'',end:'',text:'',clientKey:crypto.randomUUID()});
export type FeedbackGuide='mic'|'start'|'stop'|'speak'|'save'|'saving';

export function FeedbackComposer({cardId,version,video,onRecording,onPending,onBeginSegment,onGuideChange,guideActive=true,children,compact=false}:{cardId:string;version:Version;video:RefObject<HTMLVideoElement|null>;onRecording:(active:boolean)=>void;onPending?:(count:number)=>void;onBeginSegment?:()=>void;onGuideChange?:(guide:FeedbackGuide)=>void;guideActive?:boolean;children?:ReactNode;compact?:boolean}){
 const sample=useSample(),account=useQuery(api.accounts.me,{}),queue=useFeedbackQueue(cardId,account?.email??null);
 const key=sample?`sample:${sample.id}:${version.id}`:`feedback:${account?.email??'pending'}:${cardId}:${version.id}`;
 const [draft,setDraft]=useState<FeedbackDraft>(blank),[loadedKey,setLoadedKey]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[listening,setListening]=useState(false),[recording,setRecording]=useState(false),[audioUrl,setAudioUrl]=useState(''),[flow,setFlow]=useState('Ready'),[captured,setCaptured]=useState(0);
 const [voiceState,setVoiceState]=useState<VoiceState>('off'),[transcribing,setTranscribing]=useState(false),[heard,setHeard]=useState('');
 const [autoSavedKey,setAutoSavedKey]=useState(''),awaitingNext=useRef(false),savedAudioEnd=useRef(0);
 const autoSaveHandler=useRef(()=>{}),autosave=useRef(new FeedbackAutosave(()=>autoSaveHandler.current()));
 const current=useRef(draft),mic=useRef<MarketingMicrophone|null>(null),speech=useRef<MarketingSpeechSession|null>(null),mounted=useRef(true),audioStart=useRef(0),speechStart=useRef(-1),lastFeedbackFrame=useRef(-1),lastCheckpoint=useRef(0),interim=useRef(new Map<number,string>()),speechUsable=useRef(false),generation=useRef(0),playRequest=useRef(0);
 const handlers=useRef({start:(_time:CommandTime)=>{},stop:(_time:CommandTime)=>{},feedback:(_text:string)=>{}});
 const manualDialog=useRef<HTMLDialogElement|null>(null),manualReturnFocus=useRef<HTMLElement|null>(null),manualTitleId=useId();
 const commands=useRef(new FeedbackCommands({start:time=>handlers.current.start(time),stop:time=>handlers.current.stop(time),feedback:text=>handlers.current.feedback(text)}));
 const loaded=loadedKey===key,pending=queue.jobs.filter(job=>job.state!=='saved');
 function replace(next:FeedbackDraft){current.current=next;if(mounted.current)setDraft(next);}
 function update(value:Partial<FeedbackDraft>){replace({...current.current,...value});}
 function pcmBlob(end=mic.current?.pcm.frame){const capture=mic.current;if(!capture||end===undefined)return current.current.blob;return capture.pcm.wav(audioStart.current,Math.max(audioStart.current,end));}
 function closeMic(){autosave.current.cancel();generation.current++;const recognizer=speech.current;speech.current=null;recognizer?.stop();mic.current?.close();mic.current=null;speechUsable.current=false;setVoiceState('off');setTranscribing(false);setListening(false);setRecording(false);onRecording(false);}
 function finishRecording(){if(mic.current&&commands.current.phase==='feedback'&&!awaitingNext.current)update({blob:pcmBlob(),audioId:undefined,audioUploadId:undefined,audioUploaded:undefined});if(interim.current.size)update({text:[current.current.text,...interim.current.values()].filter(Boolean).join(' ')});interim.current.clear();closeMic();setFlow('Editing feedback');setStatus('Recording ready. Correct the transcript, replay the audio, then save.');}
 function valid(value:FeedbackDraft){return value.start!==''&&value.end!==''&&Number.isFinite(Number(value.start))&&Number.isFinite(Number(value.end))&&Number(value.start)>=0&&Number(value.end)>Number(value.start)&&Number(value.end)<=version.duration+.05;}
 function enqueue(value:FeedbackDraft,next:FeedbackDraft){
  const job:FeedbackJob={...value,versionId:version.id,versionNumber:version.number,videoDuration:version.duration,state:'queued'};
  queue.enqueue(job,[key,next]);replace(next);setStatus('Previous feedback is queued safely below. Keep marking the next clip.');
 }
 function continueFeedback(){
  if(!awaitingNext.current)return;
  awaitingNext.current=false;setAutoSavedKey('');
  if(mic.current){const pcm=mic.current.pcm;audioStart.current=Math.max(savedAudioEnd.current,pcm.utteranceStart,pcm.frame-pcm.sampleRate*2);setRecording(true);onRecording(true);setFlow('Recording feedback');}
 }
 autoSaveHandler.current=()=>{
  const value=current.current;
  if(!mounted.current||!mic.current||commands.current.phase!=='feedback'||awaitingNext.current||interim.current.size||manualDialog.current?.open||!valid(value)||!value.text.trim())return;
  // Keep this clip's bounds so a later spoken comment still has a destination.
  enqueue({...value,blob:pcmBlob(),audioId:undefined,audioUploadId:undefined,audioUploaded:undefined},{...blank(),start:value.start,end:value.end});
  awaitingNext.current=true;setAutoSavedKey(value.clientKey);setRecording(false);onRecording(false);setTranscribing(false);setCaptured(0);setFlow('Ready');setError('');
  mic.current.pcm.discardBefore(mic.current.pcm.frame);audioStart.current=mic.current.pcm.frame;savedAudioEnd.current=audioStart.current;speechStart.current=-1;lastFeedbackFrame.current=-1;
 };
 function markStart(time:CommandTime={videoTime:video.current?.currentTime??0,audioFrame:mic.current?.pcm.frame??0}){
  autosave.current.cancel();const wasWaiting=awaitingNext.current;awaitingNext.current=false;setAutoSavedKey('');
  onBeginSegment?.();
  const value={...current.current,text:[current.current.text,...interim.current.values()].filter(Boolean).join(' ')},start=Math.max(0,Math.min(version.duration,time.videoTime));
  const next={...blank(),start:(start>=version.duration?0:start).toFixed(3)};
  if(valid(value)&&!wasWaiting){
   const blob=mic.current?pcmBlob(time.audioFrame):value.blob;
   const hasComment=!!value.text.trim()||(!speechUsable.current&&!!blob&&(mic.current?mic.current.pcm.hasVoice(audioStart.current,time.audioFrame):blob.size>44));
   if(hasComment)enqueue({...value,blob,audioId:mic.current?undefined:value.audioId,audioUploadId:mic.current?undefined:value.audioUploadId,audioUploaded:mic.current?undefined:value.audioUploaded},next);else replace(next);
  }else{next.text=value.end===''?value.text:'';replace(next);}
  interim.current.clear();commands.current.phase='marking';setTranscribing(false);setRecording(false);onRecording(false);setCaptured(0);setFlow('Marking');setError('');
  mic.current?.pcm.discardBefore(mic.current.pcm.frame);audioStart.current=mic.current?.pcm.frame??0;speechStart.current=-1;lastFeedbackFrame.current=-1;
  const request=++playRequest.current;
  if(video.current)void playMarkedVideo(video.current,Number(next.start)).catch(error=>{if(mounted.current&&request===playRequest.current&&commands.current.phase==='marking')setError(message(error));});
  else setError('The video is still loading. Wait for it to appear, then say start again.');
 }
 function markStop(time:CommandTime={videoTime:video.current?.currentTime??0,audioFrame:mic.current?.pcm.frame??0}){
  autosave.current.cancel();awaitingNext.current=false;setAutoSavedKey('');
  const end=Math.min(version.duration,time.videoTime);if(current.current.start===''||end<=Number(current.current.start)){setError('Stop must be after the marked start.');commands.current.phase='marking';return;}
  playRequest.current++;update({end:end.toFixed(3)});video.current?.pause();if(video.current)video.current.currentTime=end;
  commands.current.phase='feedback';audioStart.current=mic.current?.pcm.frame??0;speechStart.current=-1;lastFeedbackFrame.current=-1;setCaptured(0);setError('');
  if(mic.current){setRecording(true);onRecording(true);setFlow('Recording feedback');}else setFlow('Editing feedback');
 }
 handlers.current={start:markStart,stop:markStop,feedback:text=>{continueFeedback();interim.current.clear();setTranscribing(false);update({text:[current.current.text,text].filter(Boolean).join(' ')});lastFeedbackFrame.current=mic.current?.pcm.frame??-1;autosave.current.finalized();}};
 function commandFrame(){const pcm=mic.current?.pcm;if(!pcm)return 0;if(pcm.utteranceStart>=audioStart.current&&pcm.utteranceStart>lastFeedbackFrame.current)return pcm.utteranceStart;if(speechStart.current>=audioStart.current&&speechStart.current>lastFeedbackFrame.current)return speechStart.current;if(lastFeedbackFrame.current>=audioStart.current)return lastFeedbackFrame.current;return audioStart.current;}
 async function enableMic(){if(mic.current||voiceState==='connecting')return;setError('');setHeard('');setVoiceState('connecting');const attempt=++generation.current;try{
  if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext)throw Error('Recording is unavailable. Use text feedback or Chrome over HTTPS.');
  const capture=await MarketingMicrophone.open(pcm=>{if(mic.current?.pcm!==pcm)return;if(commands.current.phase!=='feedback'){pcm.discardBefore(pcm.frame);return;}if(awaitingNext.current){pcm.discardBefore(Math.max(savedAudioEnd.current,pcm.frame-pcm.sampleRate*2));return;}const bytes=Math.max(0,pcm.frame-audioStart.current)*2;setCaptured(bytes);if(performance.now()-lastCheckpoint.current>500){lastCheckpoint.current=performance.now();update({blob:pcm.wav(audioStart.current,pcm.frame),audioId:undefined,audioUploadId:undefined,audioUploaded:undefined});}});
  if(!mounted.current||attempt!==generation.current){capture.close();return;}if(document.visibilityState==='hidden'){capture.close();closeMic();return;}mic.current=capture;capture.onInterrupted(()=>{finishRecording();setVoiceState('error');setError('Microphone recording was interrupted. Captured audio and text are kept. Turn the mic on to retry.');});
  commands.current.resetResults();commands.current.phase=current.current.end!==''?'feedback':current.current.start!==''?'marking':'ready';audioStart.current=capture.pcm.frame;savedAudioEnd.current=capture.pcm.frame;
  setListening(true);if(commands.current.phase==='feedback'&&!awaitingNext.current){setRecording(true);onRecording(true);setFlow('Recording feedback');}
  const Speech=(window as SpeechWindow).SpeechRecognition??(window as SpeechWindow).webkitSpeechRecognition;
  if(!Speech)throw Error('Voice commands are unavailable in this browser. Open this page in Chrome or Edge, or use the manual feedback controls.');
  const recognizer=new MarketingSpeechSession(()=>new Speech(),{
   state:state=>{speechUsable.current=state==='listening';setVoiceState(state);if(state==='listening')setStatus('Listening for commands. Say start, then stop, then speak your feedback.');},
   speechStart:()=>{autosave.current.activity();continueFeedback();speechStart.current=mic.current?.pcm.frame??-1;},
   speechEnd:()=>{},
   result:event=>{if(attempt!==generation.current)return;for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i],text=result[0].transcript.trim();setHeard(text.slice(0,140));if(!result.isFinal)autosave.current.activity();if(commands.current.phase==='feedback'&&!result.isFinal&&!playbackCommand(text)){continueFeedback();interim.current.set(i,text);setTranscribing(true);}if(result.isFinal||playbackCommand(text)){interim.current.delete(i);setTranscribing(false);}commands.current.result(i,text,result.isFinal,{videoTime:video.current?.currentTime??0,audioFrame:commands.current.phase==='feedback'?commandFrame():mic.current?.pcm.frame??0});}},
   boundary:complete=>{if(!complete||interim.current.size)autosave.current.cancel();if(complete&&attempt===generation.current)commands.current.endUtterance();if(commands.current.phase==='feedback'&&interim.current.size)update({text:[current.current.text,...interim.current.values()].filter(Boolean).join(' ')});interim.current.clear();setTranscribing(false);commands.current.resetResults();},
   error:notice=>{finishRecording();setVoiceState('error');setError(notice);},
  });
  speech.current=recognizer;recognizer.start();
 }catch(error){if(attempt!==generation.current||!mounted.current)return;closeMic();setVoiceState('error');setFlow('Ready');setError(error instanceof DOMException&&error.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser, or use Mark start, Mark stop and a text comment.':message(error));}}
 function saveFinal(){let value={...current.current};if(!valid(value)){setError('Mark a valid start and stop within this video.');return;}if(recording)value={...value,blob:pcmBlob(),audioId:undefined,audioUploadId:undefined,audioUploaded:undefined};if(interim.current.size)value.text=[value.text,...interim.current.values()].filter(Boolean).join(' ');interim.current.clear();if(!value.text.trim()&&!value.blob){setError('Speak or type feedback before saving.');return;}closeMic();enqueue(value,blank());commands.current.phase='ready';setFlow('Ready');setError('');}
 useEffect(()=>{mounted.current=true;if(!sample&&!account)return;let active=true;void queue.readBarrier().then(()=>sample?undefined:readDraft<FeedbackDraft>(key)).then(value=>{if(!active)return;if(value){replace(value);commands.current.phase=value.end!==''?'feedback':value.start!==''?'marking':'ready';setFlow('Editing feedback');setStatus('Recovered your unsaved feedback.');}setLoadedKey(key);}).catch(()=>{if(active){setLoadedKey(key);setError('Local recovery is unavailable. Keep this tab open until feedback saves.');}});return()=>{active=false;mounted.current=false;if(mic.current&&commands.current.phase==='feedback'&&!awaitingNext.current){const value={...current.current,blob:pcmBlob()};current.current=value;void queue.draft(key,value).catch(()=>{});}closeMic();};},[key,!!account]);
 useEffect(()=>{if(loaded)void queue.draft(key,draft).catch(()=>setError('Could not store browser recovery. Keep this tab open until feedback saves.'));},[draft,loaded,key,queue]);
 useEffect(()=>{onPending?.(pending.length);},[pending.length,onPending]);
 useEffect(()=>watchVoiceVisibility(()=>{if(!mic.current&&!speech.current)return;finishRecording();video.current?.pause();setStatus('Mic off while this tab is in the background. Your feedback is kept.');}),[key]);
 useEffect(()=>{const dirty=()=>!!(!awaitingNext.current&&(current.current.start||current.current.text||current.current.blob)||pending.length);const leave=(event:Event)=>{if(dirty()&&!confirm(sample?'Leave this practice feedback? Unsaved sample feedback will be discarded.':'Leave this feedback? Recording will stop. Drafts and queued comments are kept on this browser.')){event.preventDefault();return;}finishRecording();video.current?.pause();};const unload=(event:BeforeUnloadEvent)=>{if(dirty()){event.preventDefault();event.returnValue='';}};const stop=()=>finishRecording();window.addEventListener('marketing-before-leave',leave);window.addEventListener('marketing-stop-recording',stop);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('marketing-before-leave',leave);window.removeEventListener('marketing-stop-recording',stop);window.removeEventListener('beforeunload',unload);};},[key,pending.length]);
 useEffect(()=>{if(!draft.blob){setAudioUrl('');return;}const url=URL.createObjectURL(draft.blob);setAudioUrl(url);return()=>URL.revokeObjectURL(url);},[draft.blob]);
 const failed=pending.filter(job=>job.state==='failed').length,saving=pending.filter(job=>job.state==='saving').length;
 const hasDraft=!autoSavedKey&&!!(draft.start!==''||draft.end!==''||draft.text.trim()||draft.blob),hasContent=!!(draft.text.trim()||draft.blob),canSave=loaded&&valid(draft)&&hasContent;
 const guide:FeedbackGuide=failed?'saving':voiceState==='error'||voiceState==='off'&&!canSave?'mic':autoSavedKey?'start':draft.start!==''&&draft.end===''?'stop':recording&&!draft.text.trim()?'speak':canSave?'save':recording||valid(draft)&&!hasContent?'speak':voiceState==='listening'?'start':pending.length?'saving':'mic';
 useEffect(()=>{if(compact)onGuideChange?.(guide);},[compact,guide,onGuideChange]);
 function openManual(){autosave.current.cancel();manualReturnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;manualDialog.current?.showModal();}
 const micIcon=<svg className="mic-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>;
 const manualControls=<div className="trial-top-labels"><h2 id={manualTitleId}>Your feedback</h2><p role="status" className="marketing-voice-state">{flow}{voiceState==='listening'?' - Commands remain active':''}</p><p>Your browser asks for microphone permission. Audio is captured while recording feedback. Speech recognition uses your browser's speech service; text-only feedback works without it.</p><p>{recording?'Spoken feedback saves automatically after a pause. Say \u2018start\u2019 for the next clip.':'Say start to play and mark the beginning. Say stop to pause and mark the end.'}</p>
   <label>Feedback<textarea aria-label="Feedback transcript" rows={3} maxLength={10000} value={draft.text} onChange={event=>{autosave.current.cancel();awaitingNext.current=false;setAutoSavedKey('');update({text:event.target.value});}} placeholder="What should change?"/></label>
   <div className="marketing-actions"><button disabled={!loaded} onClick={()=>markStart()}>Mark start</button><button disabled={!loaded||recording||draft.start===''} onClick={()=>markStop()}>Mark stop</button></div>
   <label>Start (seconds)<input type="number" min="0" max={version.duration} step="0.001" value={draft.start} disabled={recording} onChange={event=>update({start:event.target.value})}/></label><label>Stop (seconds)<input type="number" min="0" max={version.duration} step="0.001" value={draft.end} disabled={recording} onChange={event=>update({end:event.target.value})}/></label>
   {recording&&captured>0&&<p role="status">Audio captured: {(captured/1024).toFixed(1)} KB</p>}{audioUrl&&!recording&&<><label>Original voice recording<audio aria-label="Original voice recording" controls src={audioUrl}/></label><button onClick={()=>update({blob:undefined,audioId:undefined,audioUploadId:undefined,audioUploaded:undefined})}>Use text only</button></>}
   <button className="sprint-button" disabled={!loaded||!valid(draft)||(!draft.text.trim()&&!draft.blob)} onClick={saveFinal}>Save feedback</button>
   {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}
   {queue.jobs.filter(job=>job.state!=='saved'||queue.jobs.filter(row=>row.state==='saved').slice(-3).includes(job)).map(job=><QueuedFeedback key={job.clientKey} job={job} retry={text=>queue.retry(job.clientKey,text)}/>)}{children}
  </div>;
 if(compact){
  const savedAutomatically=!!autoSavedKey&&queue.jobs.some(job=>job.clientKey===autoSavedKey&&job.state==='saved');
  const state=!loaded?'Getting ready…':voiceState==='connecting'?'Connecting mic…':voiceState==='reconnecting'?'Reconnecting…':voiceState==='error'?'Voice unavailable':transcribing?'Transcribing…':autoSavedKey?(savedAutomatically?'Feedback saved':'Saving feedback…'):recording?'Recording feedback':flow==='Marking'?'Marking clip':voiceState==='listening'?'Listening':saving?'Saving feedback…':'Mic off';
  const queuedState=failed?`${failed} ${failed===1?'comment needs':'comments need'} attention`:pending.length?`${pending.length} ${pending.length===1?'comment':'comments'} ${saving?'saving':'queued'}`:'';
  const hint=voiceState==='connecting'?'Allow microphone access if asked.':voiceState==='reconnecting'?'Keep this tab open while speech reconnects.':voiceState==='error'?'Try the mic again, or open Details for manual feedback.':failed?'Recover your feedback to continue.':voiceState==='off'&&canSave?'Turn on your mic to continue, or save.':guide==='mic'?'Turn on your mic to begin.':guide==='start'?'Say “start” to play.':guide==='stop'?'Say “stop” at the end of the clip.':guide==='speak'?'Say what should change.':guide==='save'&&recording?'Saves automatically after a pause. Say “start” for the next clip.':guide==='save'?'Save your edited feedback.':'Saving your feedback…';
  return <section className="feedback-compact-composer" aria-label="Create feedback">
   <button type="button" className={`feedback-mic-key${listening?' is-on':''}`} data-feedback-next={guideActive&&guide==='mic'||undefined} aria-label={listening?'Turn mic off':'Turn mic on'} aria-pressed={listening} disabled={!loaded||voiceState==='connecting'} onClick={()=>listening?finishRecording():void enableMic()}>{micIcon}<span>{voiceState==='connecting'?'…':listening?'Off':'On'}</span></button>
   <div className="feedback-compact-copy"><p className="feedback-compact-state" role="status" data-transcribing={transcribing||undefined}>{state}{queuedState&&<span> · {queuedState}</span>}</p><p key={guide} className="feedback-compact-hint" data-feedback-next={guideActive&&['start','stop','speak'].includes(guide)||undefined}>{hint}</p>{heard&&<p className="feedback-compact-heard" aria-label="Last words heard">Heard: “{heard}”</p>}</div>
   {(hasDraft||failed>0)&&<div className="feedback-compact-actions"><button type="button" className="feedback-write-key" data-feedback-next={guideActive&&!!failed||undefined} onClick={openManual}>{failed?'Recover feedback':'Edit draft'}</button>{canSave&&!recording&&<button type="button" className="feedback-save-key" data-feedback-next={guideActive&&guide==='save'||undefined} onClick={saveFinal}>Save feedback</button>}</div>}
   {error&&<button type="button" className="feedback-compact-error" role="alert" onClick={openManual}><span>{error.split('. ')[0]}</span><span className="feedback-error-details">Details ↗</span></button>}
   <dialog className="feedback-manual-dialog" ref={manualDialog} aria-labelledby={manualTitleId} onClose={()=>{if(mic.current&&valid(current.current)&&current.current.text.trim()&&!interim.current.size)autosave.current.finalized();if(manualReturnFocus.current?.isConnected)manualReturnFocus.current.focus();}}><button type="button" className="feedback-manual-close" aria-label="Close feedback form" onClick={()=>manualDialog.current?.close()}>Close <span aria-hidden="true">×</span></button>{manualControls}</dialog>
  </section>;
 }
 return <section className="voice-labels compact-voice marketing-feedback-controls" aria-label="Create feedback"><button className="marketing-mic" aria-pressed={listening} disabled={!loaded||voiceState==='connecting'} onClick={()=>listening?finishRecording():void enableMic()}>{micIcon}{voiceState==='connecting'?'Connecting…':recording?'Finish recording':listening?'Turn mic off':'Turn mic on'}</button>{manualControls}</section>;
}
function QueuedFeedback({job,retry}:{job:FeedbackJob;retry:(text:string)=>void}){const [text,setText]=useState(job.text),[url,setUrl]=useState('');useEffect(()=>{if(!job.blob){setUrl('');return;}const value=URL.createObjectURL(job.blob);setUrl(value);return()=>URL.revokeObjectURL(value);},[job.blob]);return <article className="marketing-queued-feedback" aria-label="Queued feedback"><strong>Version {job.versionNumber} · {job.start}–{job.end} sec</strong><p role="status">{job.state==='saved'?'Saved':job.state==='failed'?'Save failed - your feedback is kept':job.state==='saving'?'Saving feedback…':'Feedback queued'}</p>{job.state==='failed'?<><p role="alert">{job.error}</p>{url&&<audio aria-label="Queued voice recording" controls src={url}/>}<label>Queued feedback transcript<textarea aria-label="Queued feedback transcript" value={text} onChange={event=>setText(event.target.value)}/></label><button onClick={()=>retry(text)}>Retry saving feedback</button></>:<p>{job.text}</p>}</article>;}
