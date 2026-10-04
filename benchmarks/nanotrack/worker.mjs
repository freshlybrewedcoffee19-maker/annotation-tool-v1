import * as ort from './node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs';
ort.env.wasm.wasmPaths=new URL('./node_modules/onnxruntime-web/dist/',import.meta.url).href;
ort.env.wasm.numThreads=1;
self.onmessage=async({data:{provider}})=>{
 try{
  const cache=await caches.open('nanotrack-phase0-v1');const downloads=[];
  const load=async(name)=>{const url=new URL(name,import.meta.url).href,start=performance.now();let response=await cache.match(url);const cached=!!response;if(!response){response=await fetch(url);if(!response.ok)throw Error('Missing model '+name);await cache.put(url,response.clone());}const buffer=await response.arrayBuffer();downloads.push({name,cached,bytes:buffer.byteLength,ms:performance.now()-start});return buffer;};
  const start=performance.now();const backbone=await ort.InferenceSession.create(await load('backbone.onnx'),{executionProviders:[provider]});const head=await ort.InferenceSession.create(await load('head.onnx'),{executionProviders:[provider]});
  const info={backboneInputs:backbone.inputMetadata,backboneOutputs:backbone.outputMetadata,headInputs:head.inputMetadata,headOutputs:head.outputMetadata};
  let stockTemplateError;try{await backbone.run({input:new ort.Tensor('float32',new Float32Array(3*127*127),[1,3,127,127])});}catch(e){stockTemplateError=String(e);}
  const template=await ort.InferenceSession.create(await load('template.onnx'),{executionProviders:[provider]});
  const z=await template.run({input:new ort.Tensor('float32',new Float32Array(3*127*127),[1,3,127,127])});
  const times=[];let outputs;
  for(let i=0;i<50;i++){const t=performance.now();const x=await backbone.run({input:new ort.Tensor('float32',new Float32Array(3*255*255),[1,3,255,255])});outputs=await head.run({input1:z.output,input2:x.output});times.push(performance.now()-t);}
  self.postMessage({provider,downloads,loadMs:performance.now()-start,info,stockTemplateError,templateShape:z.output.dims,outputShapes:Object.values(outputs).map(v=>v.dims),inferenceOnlyBlankFramesMs:times});
  await template.release();
  await backbone.release();await head.release();
 }catch(e){self.postMessage({provider,error:String(e),stack:e.stack});}
};
