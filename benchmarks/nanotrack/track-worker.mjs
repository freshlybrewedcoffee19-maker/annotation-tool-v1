import * as ort from './node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs';
import {Tracker} from './tracker.mjs';
import {SafetyGate} from './safety-gate.mjs';
ort.env.wasm.wasmPaths=new URL('./node_modules/onnxruntime-web/dist/',import.meta.url).href;ort.env.wasm.numThreads=1;
let waiting;self.onmessage=async({data})=>{
 if(data.image){waiting(data.image);return;}
 try{
  const startIndex=data.startIndex??0,frameCount=data.frameCount??50;
  if(!Number.isInteger(frameCount)||frameCount<1||frameCount>1080)throw Error('Choose a bounded test range.');
  if(!Number.isInteger(startIndex)||startIndex<0||startIndex>=frameCount)throw Error('Choose a frame inside this test range.');
  if(startIndex>0&&!data.confirmedResume)throw Error('Confirm the reappearing object box before resuming.');
  const start=performance.now(),sessions=[];const cache=await caches.open('nanotrack-phase0-v1');
  for(const name of ['backbone.onnx','template.onnx','head.onnx']){const url=new URL(name,import.meta.url).href;let r=await cache.match(url);if(!r){r=await fetch(url);if(!r.ok)throw Error('Missing '+name);await cache.put(url,r.clone());}sessions.push(await ort.InferenceSession.create(await r.arrayBuffer(),{executionProviders:[data.provider]}));}
  const loadMs=performance.now()-start,cases=[];
  const frame=(name,index)=>new Promise(resolve=>{waiting=resolve;self.postMessage({frame:{name,index}});});
  for(const name of data.cases??['trial','motion','disappearance','partial-occlusion','lookalike','scene-cut']){
   const tracker=new Tracker(ort,sessions[0],sessions[1],sessions[2],{sizeLearningRate:data.sizeLearningRate,displaySizeLearningRate:data.displaySizeLearningRate}),gate=new SafetyGate(),displayGate=data.displaySizeLearningRate===undefined?null:new SafetyGate();let image=await frame(name,startIndex);const initialBox=data.initialBox??(name==='trial'?[70,7,231,308]:[100,100,92,124]);await tracker.init(image,initialBox);gate.confirm(image,initialBox,{confirmed:true});displayGate?.confirm(image,initialBox,{confirmed:true});image.close();
   const rows=[],started=performance.now();let stopped=false;
   for(let i=startIndex+1;i<=frameCount;i++){
    image=await frame(name,i);const t=performance.now(),raw=await tracker.track(image),trackingSafety=gate.evaluate(image,raw);let safety=trackingSafety,displaySafety=null;
    if(displayGate){displaySafety=displayGate.evaluate(image,{...raw,box:raw.displayBox});safety=trackingSafety.requiresConfirmation?{...trackingSafety,proposal:null}:displaySafety;}
    image.close();
    const valid=raw.box?.every(Number.isFinite)&&raw.score>=.8;
    if(!valid)stopped=true;
    // A score is never evidence of confirmed presence. ALL experimental proposals require checking.
    rows.push({index:i,inferenceMs:performance.now()-t,raw,heuristicStopped:stopped,trackingSafety,displaySafety,safety,state:'Needs checking',acceptedBox:null});
    // Raw continuation is allowed ONLY for a requested diagnostic comparison.
    if(safety.requiresConfirmation&&!data.diagnostics)break;
   }
   cases.push({name,processingMs:performance.now()-started,rows});self.postMessage({progress:name});
  }
  for(const session of sessions)await session.release();self.postMessage({loadMs,cases});
 }catch(e){self.postMessage({error:String(e),stack:e.stack});}
};
