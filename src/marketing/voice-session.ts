export type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;abort:()=>void;onstart:(()=>void)|null;onresult:((event:any)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;onspeechstart:(()=>void)|null;onspeechend:(()=>void)|null};
export type VoiceState='off'|'connecting'|'listening'|'reconnecting'|'error';

/** Release this workflow's microphone when its tab is no longer visible. */
export function watchVoiceVisibility(onHidden:()=>void,target:EventTarget&{readonly visibilityState:DocumentVisibilityState}=document){
 const changed=()=>{if(target.visibilityState==='hidden')onHidden();};
 target.addEventListener('visibilitychange',changed);
 return ()=>target.removeEventListener('visibilitychange',changed);
}
type Handlers={state:(state:VoiceState)=>void;error:(message:string)=>void;result:(event:any)=>void;boundary:(complete:boolean)=>void;speechStart:()=>void;speechEnd:()=>void};
const browserGuidance='Use Safari on iPhone or Chrome on Android, or use the manual controls.';

/** A connected audio recorder is not proof that the browser's speech service is listening. */
export class MarketingSpeechSession {
 private recognizer:Recognition|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private progressTimer:ReturnType<typeof setTimeout>|undefined;
 private playbackTimer:ReturnType<typeof setTimeout>|undefined;
 private active=false;
 private listening=false;
 private speechActive=false;
 private hasInterim=false;
 private failures=0;
 private stalledFailures=0;
 constructor(private create:()=>Recognition,private handlers:Handlers,private options:{continuous?:boolean}={}){}
 start(){if(this.active)return;this.active=true;this.failures=0;this.stalledFailures=0;this.handlers.state('connecting');this.connect();}
 stop(){this.active=false;this.retire();this.handlers.state('off');}
 /** Call only for captured voice, never for silent audio frames or an open microphone alone. */
 noteAudioActivity(){
  if(!this.active||!this.listening||!this.recognizer||this.progressTimer!==undefined)return;
  const recognition=this.recognizer;
  this.progressTimer=setTimeout(()=>{
   this.progressTimer=undefined;
   if(!this.active||this.recognizer!==recognition)return;
   if(++this.stalledFailures>2){this.fail(`The microphone heard audio, but the speech service returned no words. Your feedback is kept. Turn the mic on to retry. ${browserGuidance}`);return;}
   this.reconnect();
  },8000);
 }
 /** Some mobile speech services need a fresh session after video playback changes. */
 refreshAfterPlayback(){
  if(!this.active||!this.listening||!this.recognizer)return;
  if(this.speechActive||this.hasInterim){this.clearPlaybackRefresh();this.noteAudioActivity();return;}
  clearTimeout(this.playbackTimer);const recognition=this.recognizer;
  this.playbackTimer=setTimeout(()=>{
   this.playbackTimer=undefined;
   if(!this.active||!this.listening||this.recognizer!==recognition)return;
   // A media change is not a finished utterance: keep an unfinished "start..." as feedback.
   this.reconnect(false,false,0);
  },300);
 }
 private clearProgress(){clearTimeout(this.progressTimer);this.progressTimer=undefined;}
 private clearPlaybackRefresh(){clearTimeout(this.playbackTimer);this.playbackTimer=undefined;}
 private retire(){
  clearTimeout(this.timer);this.timer=undefined;
  this.clearPlaybackRefresh();
  this.clearProgress();this.listening=false;this.speechActive=false;this.hasInterim=false;
  const current=this.recognizer;this.recognizer=null;if(!current)return;
  current.onstart=null;current.onresult=null;current.onerror=null;current.onend=null;current.onspeechstart=null;current.onspeechend=null;
  try{current.abort();}catch{/* Already ended. */}
 }
 private fail(message:string){this.active=false;this.retire();this.handlers.boundary(false);this.handlers.state('error');this.handlers.error(message);}
 private reconnect(failed=false,complete=false,delay=250){
  this.retire();this.handlers.boundary(complete);
  if(failed&&++this.failures>2){this.fail('Speech could not connect to the network. Your feedback is kept. Try the mic again, or use the manual controls.');return;}
  this.handlers.state('reconnecting');
  if(!failed&&delay===0){if(this.active)this.connect();return;}
  this.timer=setTimeout(()=>{if(this.active)this.connect();},failed?300*this.failures:delay);
 }
 private connect(){
  if(!this.active)return;
  let recognition:Recognition;
  try{recognition=this.create();}catch{this.fail(`Speech recognition is unavailable in this browser. ${browserGuidance}`);return;}
  this.recognizer=recognition;recognition.continuous=this.options.continuous??true;recognition.interimResults=true;recognition.lang='en-US';
  const current=()=>this.active&&this.recognizer===recognition;
  recognition.onstart=()=>{if(!current())return;clearTimeout(this.timer);this.timer=undefined;this.listening=true;this.handlers.state('listening');};
  recognition.onresult=event=>{
   if(!current())return;
   this.clearProgress();this.clearPlaybackRefresh();this.failures=0;this.stalledFailures=0;
   this.hasInterim=Array.from(event.results??[]).some((result:any)=>!result.isFinal);
   if(this.hasInterim)this.noteAudioActivity();else this.speechActive=false;
   this.handlers.result(event);
  };
  recognition.onspeechstart=()=>{if(current()){this.speechActive=true;this.clearPlaybackRefresh();this.noteAudioActivity();this.handlers.speechStart();}};
  recognition.onspeechend=()=>{if(current()){this.speechActive=false;this.handlers.speechEnd();}};
  recognition.onend=()=>{if(current())this.reconnect(false,true);};
  recognition.onerror=event=>{
   if(!current())return;
   if(event.error==='no-speech'){this.reconnect();return;}
   if(event.error==='network'){this.reconnect(true);return;}
   if(event.error==='aborted'){this.fail('Voice listening was interrupted. Turn the mic on again when you are ready. Your feedback is kept.');return;}
   const message=event.error==='not-allowed'||event.error==='service-not-allowed'
    ?'Speech permission was denied. Allow microphone and speech access, then turn the mic on again. On iPhone, use Safari and enable Siri or Dictation in Settings; on Android, use Chrome. Your feedback is kept.'
    :event.error==='audio-capture'
     ?'Speech could not hear your microphone. Check the selected microphone and try again. Your feedback is kept.'
     :`Speech recognition is unavailable in this browser. Your feedback is kept. ${browserGuidance}`;
   this.fail(message);
  };
  this.timer=setTimeout(()=>{if(current())this.fail('Speech did not connect. Check your connection and microphone permission, then try again. Your feedback is kept.');},10000);
  try{recognition.start();}catch{this.fail('Speech could not start. Try the mic again, or use the manual controls. Your feedback is kept.');}
 }
}
