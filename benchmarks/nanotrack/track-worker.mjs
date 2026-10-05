import * as ort from './node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs';
import {Tracker} from './tracker.mjs';
ort.env.wasm.wasmPaths=new URL('./node_modules/onnxruntime-web/dist/',import.meta.url).href;ort.env.wasm.numThreads=1;
let waiting;self.onmessage=async({data})=>{
 if(data.image){waiting(data.image);return;}
 try{
  const start=performance.now(),sessions=[];const cache=await caches.open('nanotrack-phase0-v1');
  for(const name of ['backbone.onnx','template.onnx','head.onnx']){const url=new URL(name,import.meta.url).href;let r=await cache.match(url);if(!r){r=await fetch(url);if(!r.ok)throw Error('Missing '+name);await cache.put(url,r.clone());}sessions.push(await ort.InferenceSession.create(await r.arrayBuffer(),{executionProviders:[data.provider]}));}
  const loadMs=performance.now()-start,cases=[];
  const frame=(name,index)=>new Promise(resolve=>{waiting=resolve;self.postMessage({frame:{name,index}});});
  for(const name of data.cases??['trial','motion','disappearance','partial-occlusion','lookalike','scene-cut']){
   const tracker=new Tracker(ort,sessions[0],sessions[1],sessions[2]);let image=await frame(name,0);await tracker.init(image,data.initialBox??(name==='trial'?[70,7,231,308]:[100,100,92,124]));image.close();
   const rows=[],started=performance.now();let stopped=false;
   for(let i=1;i<=50;i++){
    image=await frame(name,i);const t=performance.now(),raw=await tracker.track(image);image.close();
    const valid=raw.box?.every(Number.isFinite)&&raw.score>=.8;
    if(!valid)stopped=true;
    // A score is never evidence of confirmed presence. ALL experimental proposals require checking.
    rows.push({index:i,inferenceMs:performance.now()-t,raw,heuristicStopped:stopped,state:'Needs checking',acceptedBox:null});
   }
   cases.push({name,processingMs:performance.now()-started,rows});self.postMessage({progress:name});
  }
  for(const session of sessions)await session.release();self.postMessage({loadMs,cases});
 }catch(e){self.postMessage({error:String(e),stack:e.stack});}
};
