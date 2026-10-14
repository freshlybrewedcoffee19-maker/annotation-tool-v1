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
export class MarketingMicrophone {
 readonly pcm:PcmTimeline;
 private source:MediaStreamAudioSourceNode;
 private node:AudioWorkletNode;
 private closed=false;
 private constructor(private context:AudioContext,private stream:MediaStream,source:MediaStreamAudioSourceNode,node:AudioWorkletNode,onData:(pcm:PcmTimeline)=>void){
  this.pcm=new PcmTimeline(context.sampleRate);this.source=source;this.node=node;
  node.port.onmessage=event=>{this.pcm.append(event.data);onData(this.pcm);};
 }
 static async open(onData:(pcm:PcmTimeline)=>void){
  const context=new AudioContext();
  // Resume synchronously from the mic click, before the permission promise loses user activation.
  const activated=context.resume();void activated.catch(()=>{});
  let stream:MediaStream|undefined;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});await activated;await context.audioWorklet.addModule(new URL('./capture-worklet.js',import.meta.url));const source=context.createMediaStreamSource(stream),node=new AudioWorkletNode(context,'marketing-feedback-capture');const capture=new MarketingMicrophone(context,stream,source,node,onData);source.connect(node);node.connect(context.destination);return capture;}
  catch(error){stream?.getTracks().forEach(track=>track.stop());await context.close().catch(()=>{});throw error;}
 }
 onInterrupted(callback:()=>void){this.stream.getAudioTracks().forEach(track=>{track.onended=callback;});}
 close(){if(this.closed)return;this.closed=true;this.node.port.onmessage=null;this.source.disconnect();this.node.disconnect();this.stream.getTracks().forEach(track=>{track.onended=null;track.stop();});void this.context.close().catch(()=>{});}
}
