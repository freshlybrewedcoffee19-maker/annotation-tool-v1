import {SamModel,AutoProcessor,RawImage,env,type SamProcessor} from '@huggingface/transformers';
import {validMaskPoints,validProposal,type SuggestionRequest,type SuggestionResponse} from './mask-suggestions';
const scope=self as unknown as {postMessage:(message:SuggestionResponse,transfer?:Transferable[])=>void;onmessage:(event:MessageEvent<SuggestionRequest>)=>void};
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath='/mask-model/';
env.backends.onnx.wasm!.wasmPaths={mjs:new URL('/mask-model/runtime-4.3.1/ort-wasm-simd-threaded.mjs',self.location.href).href,wasm:new URL('/mask-model/runtime-4.3.1/ort-wasm-simd-threaded.wasm',self.location.href).href};
env.backends.onnx.wasm!.numThreads=1;env.backends.onnx.wasm!.proxy=false;
let resources:Promise<[Awaited<ReturnType<typeof SamModel.from_pretrained>>,Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>]>|undefined;
let running=false;
scope.onmessage=async({data:a})=>{
 if(running){scope.postMessage({id:a.id,type:'error',message:'A suggestion is already running.'});return;}
 running=true;
 try{
  if(!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width*a.height>2000000||a.image.length!==a.width*a.height*4||!validMaskPoints(a.points,a.width,a.height))throw Error('Add at least one point inside the object. Use up to 20 points.');
  scope.postMessage({id:a.id,type:'progress',message:resources?'Preparing this frame…':'Loading the mask model on this device… First use downloads about 55 MB.'});
  resources??=Promise.all([SamModel.from_pretrained('slimsam-77-5850ab4',{dtype:'fp32',device:'wasm',local_files_only:true}),AutoProcessor.from_pretrained('slimsam-77-5850ab4',{local_files_only:true})]).catch(e=>{resources=undefined;throw e;});
  const [model,loadedProcessor]=await resources!;const processor=loadedProcessor as SamProcessor;scope.postMessage({id:a.id,type:'progress',message:'Finding the object pixels on this device…'});const start=performance.now();
  const inputs=await processor(new RawImage(a.image,a.width,a.height,4).rgb(),{input_points:[a.points.map(p=>[p.x,p.y])],input_labels:[a.points.map(p=>p.label)]});
  const result=await model(inputs),masks=await processor.post_process_masks(result.pred_masks,inputs.original_sizes,inputs.reshaped_input_sizes);
  const proposals:MaskProposalResult[]=[];
  for(let i=0;i<3;i++){const pixels=Uint8Array.from(masks[0][0][i].data as Uint8Array,p=>p?1:0),score=Number(result.iou_scores.data[i]);if(validProposal(pixels,a.width,a.height)&&Number.isFinite(score))proposals.push({pixels,score});}
  for(const value of Object.values(inputs))if(value&&typeof value==='object'&&'dispose' in value&&typeof value.dispose==='function')value.dispose();result.pred_masks.dispose();result.iou_scores.dispose();
  proposals.sort((a,b)=>b.score-a.score);
  scope.postMessage({id:a.id,type:'result',proposals,milliseconds:performance.now()-start},proposals.map(p=>p.pixels.buffer as ArrayBuffer));
 }catch{scope.postMessage({id:a.id,type:'error',message:'Suggestions could not finish on this device. Retry, or keep painting by hand.'});}
 finally{running=false;}
};
type MaskProposalResult={pixels:Uint8Array;score:number};
