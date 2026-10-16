/** Marketing-only PCM timeline. Immutable WAV snapshots never share mutable recording buffers. */
export class PcmTimeline {
 frame=0;utteranceStart=0;
 private parts:{start:number;samples:Float32Array}[]=[];
 private lastVoice=-Infinity;
 constructor(public readonly sampleRate:number){}
 append(samples:Float32Array){
  let energy=0;for(const sample of samples)energy+=sample*sample;
  if(Math.sqrt(energy/Math.max(1,samples.length))>.012){
   if(this.frame-this.lastVoice>this.sampleRate*.18)this.utteranceStart=this.frame;
   this.lastVoice=this.frame+samples.length;
  }
  this.parts.push({start:this.frame,samples:samples.slice()});this.frame+=samples.length;
 }
 hasVoice(start:number,end=this.frame){return this.parts.some(part=>part.start+part.samples.length>start&&part.start<end&&part.samples.some(sample=>Math.abs(sample)>.025));}
 discardBefore(frame:number){this.parts=this.parts.filter(part=>part.start+part.samples.length>frame);}
 wav(start:number,end=this.frame){
  start=Math.max(0,Math.floor(start));end=Math.max(start,Math.min(this.frame,Math.floor(end)));
  const size=(end-start)*2,buffer=new ArrayBuffer(44+size),view=new DataView(buffer);
  const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+size,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,this.sampleRate,true);view.setUint32(28,this.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,size,true);
  for(const part of this.parts){const from=Math.max(start,part.start),to=Math.min(end,part.start+part.samples.length);for(let frame=from;frame<to;frame++){const sample=Math.max(-1,Math.min(1,part.samples[frame-part.start]));view.setInt16(44+(frame-start)*2,Math.round(sample*(sample<0?32768:32767)),true);}}
  return new Blob([buffer],{type:'audio/wav'});
 }
}
const audioSetupTimeout=8000,captureGrace=2000,frameTimeout=4000;
const audioRunning=(context:AudioContext)=>!context.state||context.state==='running';
function stopStream(stream:MediaStream){for(const track of stream.getTracks())try{track.stop();}catch{/* Already released. */}}
function closeContext(context:AudioContext){try{void Promise.resolve(context.close()).catch(()=>{});}catch{/* Already closed. */}}
function audioSetup(operation:()=>Promise<void>,signal:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  let settled=false;
  const finish=(error?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve();};
  const cancel=()=>finish(new Error('Microphone setup was cancelled.'));
  const timer=setTimeout(()=>finish(new Error('Microphone audio did not start. Turn the mic on again to retry.')),audioSetupTimeout);
  signal.addEventListener('abort',cancel,{once:true});
  try{void operation().then(()=>finish(),error=>finish(error));}catch(error){finish(error);}
 });
}
async function ensureAudioRunning(context:AudioContext,signal:AbortSignal){
 if(!audioRunning(context))await audioSetup(()=>context.resume(),signal);
 if(!audioRunning(context))throw Error('Microphone audio did not start. Turn the mic on again to retry.');
}

export class MarketingMicrophone {
 readonly pcm:PcmTimeline;
 private source:MediaStreamAudioSourceNode;
 private node:AudioWorkletNode;
 private closed=false;
 private lastFrameAt=Date.now();
 private interrupted:((reason:string)=>void)|undefined;
 private healthTimer:ReturnType<typeof setInterval>|undefined;
 private unhealthy:{reason:string;since:number}|undefined;
 private constructor(private context:AudioContext,private stream:MediaStream,source:MediaStreamAudioSourceNode,node:AudioWorkletNode,onData:(pcm:PcmTimeline)=>void){
  this.pcm=new PcmTimeline(context.sampleRate);this.source=source;this.node=node;
  node.port.onmessage=event=>{if(this.closed||!event.data?.length)return;this.lastFrameAt=Date.now();this.pcm.append(event.data);onData(this.pcm);};
 }
 static async open(onData:(pcm:PcmTimeline)=>void){
  const context=new AudioContext(),setup=new AbortController();
  // Resume synchronously from the mic click, before the permission promise loses user activation.
  const activated=audioSetup(()=>context.resume(),setup.signal);void activated.catch(()=>{});
  let stream:MediaStream|undefined,source:MediaStreamAudioSourceNode|undefined,node:AudioWorkletNode|undefined,capture:MarketingMicrophone|undefined,cancelled=false;
  try{
   const permission=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(value=>{if(cancelled)stopStream(value);else stream=value;return value;});
   await Promise.all([permission,activated]);
   // Acquiring the microphone can change the phone's audio session after the initial resume.
   await ensureAudioRunning(context,setup.signal);
   await audioSetup(()=>context.audioWorklet.addModule(new URL('./capture-worklet.js',import.meta.url)),setup.signal);
   await ensureAudioRunning(context,setup.signal);
   source=context.createMediaStreamSource(stream!);node=new AudioWorkletNode(context,'marketing-feedback-capture');
   capture=new MarketingMicrophone(context,stream!,source,node,onData);source.connect(node);node.connect(context.destination);return capture;
  }catch(error){
   cancelled=true;
   if(capture)capture.close();else{try{source?.disconnect();}catch{/* Partial setup. */}try{node?.disconnect();}catch{/* Partial setup. */}if(stream)stopStream(stream);closeContext(context);}
   throw error;
  }finally{setup.abort();}
 }
 onInterrupted(callback:(reason:string)=>void){
  if(this.closed)return;this.interrupted=callback;clearInterval(this.healthTimer);
  for(const track of this.stream.getAudioTracks()){
   track.onended=()=>this.fail('Microphone recording ended. Turn the mic on again to retry.');
   track.onmute=track.onunmute=()=>this.checkHealth();
  }
  this.context.onstatechange=()=>this.checkHealth();
  this.healthTimer=setInterval(()=>this.checkHealth(),250);this.checkHealth();
 }
 private checkHealth(){
  if(this.closed||!this.interrupted)return;
  const tracks=this.stream.getAudioTracks(),now=Date.now();
  if(tracks.some(track=>track.readyState==='ended')){this.fail('Microphone recording ended. Turn the mic on again to retry.');return;}
  const reason=tracks.some(track=>track.muted)?'Your browser muted the voice recording. Turn the mic on again to retry.':!audioRunning(this.context)?'Microphone audio was interrupted. Turn the mic on again to retry.':'';
  if(reason){
   if(this.unhealthy?.reason!==reason)this.unhealthy={reason,since:now};
   if(now-this.unhealthy!.since>=captureGrace)this.fail(reason);
   return;
  }
  this.unhealthy=undefined;
  // Silent samples are healthy. Only a stopped flow of frames means capture has stalled.
  if(now-this.lastFrameAt>=frameTimeout)this.fail('Microphone audio stopped arriving. Turn the mic on again to retry.');
 }
 private fail(reason:string){
  if(this.closed||!this.interrupted)return;
  const callback=this.interrupted;this.close();callback(reason);
 }
 close(){
  if(this.closed)return;this.closed=true;this.interrupted=undefined;clearInterval(this.healthTimer);this.healthTimer=undefined;this.unhealthy=undefined;
  this.node.port.onmessage=null;this.context.onstatechange=null;
  try{this.source.disconnect();}catch{/* Already disconnected. */}try{this.node.disconnect();}catch{/* Already disconnected. */}
  this.stream.getTracks().forEach(track=>{track.onended=null;track.onmute=null;track.onunmute=null;});stopStream(this.stream);closeContext(this.context);
 }
}
