import {useEffect,useRef,useState} from 'react';
import type {Id} from '../convex/_generated/dataModel';
import type {VoiceState} from './voice-segments';

// Presentation only: commands and persistence remain owned by VoiceLabels.
export function TrialActionGuide({episodeId,count}:{episodeId:Id<'episodes'>;count:number}){
 const [listening,setListening]=useState(false);
 const [state,setState]=useState<VoiceState>({waiting:'start',start_sec:null,end_sec:null,error:null});
 const [saved,setSaved]=useState(false),[saving,setSaving]=useState(false);
 const previous=useRef(count);
 useEffect(()=>{if(count>previous.current)setSaved(true);else if(count<previous.current)setSaved(false);previous.current=count;},[count]);
 useEffect(()=>{
  const mic=(event:Event)=>{const d=(event as CustomEvent).detail;if(d.episodeId===episodeId)setListening(d.listening);};
  const progress=(event:Event)=>{const d=(event as CustomEvent).detail;if(d.episodeId===episodeId){setState(d.state);if(d.state.waiting!=='start')setSaved(false);}};
  const pending=(event:Event)=>{const d=(event as CustomEvent).detail;if(d.episodeId===episodeId)setSaving(d.pending>0||d.failed>0);};
  window.addEventListener('cv-mic-state',mic);window.addEventListener('cv-voice-progress',progress);window.addEventListener('cv-voice-saving',pending);
  queueMicrotask(()=>window.dispatchEvent(new CustomEvent('cv-voice-status-request',{detail:{episodeId}})));
  return ()=>{window.removeEventListener('cv-mic-state',mic);window.removeEventListener('cv-voice-progress',progress);window.removeEventListener('cv-voice-saving',pending);};
 },[episodeId]);
 const line=!listening?'Turn on your mic':state.waiting==='stop'?'Say stop':state.waiting==='label'?'Say a label':saving?'Saving…':saved?'Saved. Do the next one':'Say start';
 const total=count+(state.start_sec!==null||saving?1:0);
 return <div className="trial-action-guide">
  <div className="trial-guide-line" hidden><strong role="status" aria-live="polite">{line}</strong><span aria-label="Labelling progress">{count} of {total} segments labelled</span></div>
  <details className="trial-how"><summary aria-label="Annotation help" title="Annotation help"><span aria-hidden="true">i</span></summary><div><button type="button" className="trial-help-close" aria-label="Close annotation help" onClick={event=>{const details=event.currentTarget.closest('details');if(details)details.open=false;}}>×</button><ol><li>Turn on your mic and say “start” to play and mark the beginning.</li><li>Say “stop” to pause and mark the end.</li><li>Say any label—the segment saves automatically.</li></ol></div></details>
 </div>;
}


