export type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;abort:()=>void;onstart:(()=>void)|null;onresult:((event:any)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;onspeechstart:(()=>void)|null;onspeechend:(()=>void)|null};
export type VoiceState='off'|'connecting'|'listening'|'reconnecting'|'error';
type Handlers={state:(state:VoiceState)=>void;error:(message:string)=>void;result:(event:any)=>void;boundary:(complete:boolean)=>void;speechStart:()=>void;speechEnd:()=>void};

/** A connected audio recorder is not proof that the browser's speech service is listening. */
export class MarketingSpeechSession {
 private recognizer:Recognition|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private active=false;
 private failures=0;
 constructor(private create:()=>Recognition,private handlers:Handlers){}
 start(){if(this.active)return;this.active=true;this.failures=0;this.handlers.state('connecting');this.connect();}
 stop(){this.active=false;this.retire();this.handlers.state('off');}
 private retire(){
  clearTimeout(this.timer);this.timer=undefined;
  const current=this.recognizer;this.recognizer=null;if(!current)return;
  current.onstart=null;current.onresult=null;current.onerror=null;current.onend=null;current.onspeechstart=null;current.onspeechend=null;
  try{current.abort();}catch{/* Already ended. */}
 }
 private fail(message:string){this.active=false;this.retire();this.handlers.boundary(false);this.handlers.state('error');this.handlers.error(message);}
 private reconnect(failed=false,complete=false){
  this.retire();this.handlers.boundary(complete);
  if(failed&&++this.failures>2){this.fail('Speech could not connect to the network. Your feedback is kept. Try the mic again, or use the manual controls.');return;}
  this.handlers.state('reconnecting');this.timer=setTimeout(()=>{if(this.active)this.connect();},failed?300*this.failures:250);
 }
 private connect(){
  if(!this.active)return;
  let recognition:Recognition;
  try{recognition=this.create();}catch{this.fail('Speech recognition is unavailable in this browser. Use Chrome or Edge, or the manual controls.');return;}
  this.recognizer=recognition;recognition.continuous=true;recognition.interimResults=true;recognition.lang='en-US';
  const current=()=>this.active&&this.recognizer===recognition;
  recognition.onstart=()=>{if(!current())return;clearTimeout(this.timer);this.timer=undefined;this.handlers.state('listening');};
  recognition.onresult=event=>{if(!current())return;this.failures=0;this.handlers.result(event);};
  recognition.onspeechstart=()=>{if(current())this.handlers.speechStart();};
  recognition.onspeechend=()=>{if(current())this.handlers.speechEnd();};
  recognition.onend=()=>{if(current())this.reconnect(false,true);};
  recognition.onerror=event=>{
   if(!current())return;
   if(event.error==='no-speech'){this.reconnect();return;}
   if(event.error==='network'||event.error==='aborted'){this.reconnect(true);return;}
   const message=event.error==='not-allowed'||event.error==='service-not-allowed'
    ?'Speech permission was denied. Allow microphone and speech access in your browser, then turn the mic on again. Your feedback is kept.'
    :event.error==='audio-capture'
     ?'Speech could not hear your microphone. Check the selected microphone and try again. Your feedback is kept.'
     :'Speech recognition is unavailable in this browser. Your feedback is kept. Try Chrome or Edge, or use the manual controls.';
   this.fail(message);
  };
  this.timer=setTimeout(()=>{if(current())this.fail('Speech did not connect. Check your connection and microphone permission, then try again. Your feedback is kept.');},10000);
  try{recognition.start();}catch{this.fail('Speech could not start. Try the mic again, or use the manual controls. Your feedback is kept.');}
 }
}
