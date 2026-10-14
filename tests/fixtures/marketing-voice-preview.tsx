import {useSyncExternalStore} from 'react';
import type {Recognition} from '../../src/marketing/voice-session';

// Imported only by the development fixture, never by the production entry point.
const enabled=import.meta.env.DEV&&new URLSearchParams(location.search).get('voiceTest')==='1';
let active:SimulatedSpeech|null=null,revision=0;
const listeners=new Set<()=>void>();
const update=()=>{revision++;listeners.forEach(listener=>listener());};
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const snapshot=()=>revision;

class SimulatedSpeech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 private results:any[]=[];private partial:number|null=null;private started=false;
 start(){this.started=true;active=this;update();setTimeout(()=>{if(this.started)this.onstart?.();},30);}
 abort(){this.started=false;if(active===this)active=null;update();}
 say(text:string,final=true){
  if(!this.started)return;
  this.onspeechstart?.();const index=this.partial??this.results.length;
  this.results[index]={isFinal:final,0:{transcript:text}};this.partial=final?null:index;
  this.onresult?.({resultIndex:index,results:this.results});if(final)this.onspeechend?.();
 }
}
class SimulatedWorklet {
 port:{onmessage:((event:{data:Float32Array})=>void)|null}={onmessage:null};
 private timer=setInterval(()=>this.port.onmessage?.({data:Float32Array.from({length:800},(_,index)=>Math.sin(index*.15)*.1)}),100);
 connect(){}disconnect(){clearInterval(this.timer);}
}
class SimulatedAudioContext {
 sampleRate=8000;audioWorklet={addModule:async()=>{}};
 resume=async()=>{};close=async()=>{};
 createMediaStreamSource(){return {connect(){},disconnect(){}};}
}

export function installVoicePreview(){
 if(!enabled)return;
 Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:SimulatedSpeech});
 Object.defineProperty(window,'AudioContext',{configurable:true,value:SimulatedAudioContext});
 Object.defineProperty(window,'AudioWorkletNode',{configurable:true,value:SimulatedWorklet});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{const track={onended:null,stop(){}};return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}});
}
export function VoicePreviewTray(){
 useSyncExternalStore(subscribe,snapshot);
 if(!enabled)return null;
 const button={fontSize:14,minHeight:36,padding:'6px 10px',background:'#fff',color:'#172033',border:'1px solid #8a7958',borderRadius:5};
 return <details open aria-label="Voice simulation controls" style={{padding:'8px 16px',background:'#fff2ca',color:'#172033',font:'14px Segoe UI,sans-serif',borderBottom:'1px solid #8a7958'}}>
  <summary>Voice test controls — simulated audio only</summary>
  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:5}}>
   <span role="status">{active?'Speech connected (simulated).':'Turn on the page mic to connect.'}</span>
   <button style={button} disabled={!active} onClick={()=>active?.say('Start')}>Simulate Start</button>
   <button style={button} disabled={!active} onClick={()=>{const current=active;setTimeout(()=>{if(active===current)current?.say('Start',false);},50);}}>Simulate interim Start</button>
   <button style={button} disabled={!active} onClick={()=>active?.onspeechend?.()}>Finish spoken phrase</button>
   <button style={button} disabled={!active} onClick={()=>active?.say('Start with the logo instead.')}>Simulate feedback starting with Start</button>
   <button style={button} disabled={!active} onClick={()=>active?.say('Stop')}>Simulate Stop</button>
   <button style={button} disabled={!active} onClick={()=>{const current=active;current?.say('Make the ending brighter.',false);setTimeout(()=>{if(active===current)current?.say('Make the ending brighter.');},450);}}>Simulate feedback</button>
   <button style={button} disabled={!active} onClick={()=>active?.say('Keep this unfinished comment.',false)}>Simulate interim feedback</button>
   <button style={button} disabled={!active} onClick={()=>active?.onerror?.({error:'not-allowed'})}>Simulate speech denied</button>
   <button style={button} disabled={!active} onClick={()=>active?.onend?.()}>Simulate idle reconnect</button>
  </div>
 </details>;
}
