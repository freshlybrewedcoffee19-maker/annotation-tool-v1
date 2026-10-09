import * as ort from 'onnxruntime-web/wasm';
import {Tracker} from './tracker';
import {ImageTrackingGuard} from './guard';
import {trackingTimes,validTrackingBox,type TrackingFrame} from './rules';
import type {TrackingStart,TrackingInput,TrackingOutput} from './messages';
const scope=self as unknown as {postMessage:(m:TrackingOutput)=>void;onmessage:(e:MessageEvent<TrackingInput>)=>void};
ort.env.wasm.wasmPaths={mjs:new URL('/mask-model/runtime-4.3.1/ort-wasm-simd-threaded.mjs',self.location.href).href,wasm:new URL('/mask-model/runtime-4.3.1/ort-wasm-simd-threaded.wasm',self.location.href).href};ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
let active:TrackingStart|null=null,waiting:{index:number;resolve:(m:Extract<TrackingInput,{type:'image'}>)=>void}|null=null;
const hashes:Record<string,string>={'backbone.onnx':'50be1320abf9384fd3479ea829f95e244cf3f3838190c5ab60c750fb8c1ce828','template.onnx':'d81e444720be56f23b9df71df2a902307bef8d41ef7a9663b4cd97040c134da4','head.onnx':'75357903be3f4817c965af16cb5a11fd32b1467f597a408405a98635ac63f61d'};
scope.onmessage=({data:a})=>{if(a.type==='image'){if(active?.id===a.id&&waiting?.index===a.index){waiting.resolve(a);waiting=null;}else a.image.close();return;}if(active)return;active=a;void run(a);};
async function run(a:TrackingStart){const sessions:ort.InferenceSession[]=[];let tracker:Tracker|undefined;const start=performance.now();try{
 const times=trackingTimes(a.times[0],a.times.at(-1)!);if(times.length!==a.times.length||times.some((t,i)=>Math.abs(t-a.times[i])>1e-6)||a.width*a.height>640*640||!validTrackingBox(a.box,a.width,a.height))throw Error('Invalid starting frame.');
 scope.postMessage({id:a.id,type:'progress',message:'Loading tracking on this device… First use downloads about 19 MB, including the shared runtime.'});
 for(const name of ['backbone.onnx','template.onnx','head.onnx']){const r=await fetch('/tracking-model/nanotrack-v3-248663f/'+name);if(!r.ok)throw Error('Tracking model unavailable.');const bytes=await r.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');if(digest!==hashes[name])throw Error('Tracking model integrity failed.');sessions.push(await ort.InferenceSession.create(bytes,{executionProviders:['wasm']}));}
 tracker=new Tracker(ort,sessions[0],sessions[1],sessions[2],{displaySizeLearningRate:.8});const gate=new ImageTrackingGuard(),displayGate=new ImageTrackingGuard(),frames:TrackingFrame[]=[];
 const get=(index:number)=>new Promise<Extract<TrackingInput,{type:'image'}>>(resolve=>{waiting={index,resolve};scope.postMessage({id:a.id,type:'frame',index});});
 const initial=await get(0);try{await tracker.init(initial.image,a.box);gate.confirm(initial.image,a.box);displayGate.confirm(initial.image,a.box);}finally{initial.image.close();}
 frames.push({time:times[0],decodedTime:initial.decodedTime,x:a.box[0]/a.width,y:a.box[1]/a.height,width:a.box[2]/a.width,height:a.box[3]/a.height,uncertain:true});
 for(let i=1;i<times.length;i++){scope.postMessage({id:a.id,type:'progress',message:'Following the object · frame '+(i+1)+' of '+times.length});const next=await get(i);let reason:string|null,box;try{const raw=await tracker.track(next.image);reason=gate.evaluate(next.image,raw);const displayReason=displayGate.evaluate(next.image,{...raw,box:raw.displayBox});reason??=displayReason;box=raw.displayBox;}finally{next.image.close();}
 if(reason||!box){scope.postMessage({id:a.id,type:'result',frames,stoppedAt:times[i],stopReason:reason??'No usable outline found.',milliseconds:performance.now()-start});return;}
 frames.push({time:times[i],decodedTime:next.decodedTime,x:box[0]/a.width,y:box[1]/a.height,width:box[2]/a.width,height:box[3]/a.height,uncertain:true});}
 scope.postMessage({id:a.id,type:'result',frames,milliseconds:performance.now()-start});
 }catch{scope.postMessage({id:a.id,type:'error',message:'Tracking could not finish on this device. Your saved annotations are unchanged. Retry, or draw outlines by hand.'});}
 finally{tracker?.z?.dispose();for(const session of sessions)await session.release();active=null;waiting=null;}}
