import {useEffect,useState,type RefObject} from 'react';

/** The small public trial is loaded once into browser memory so it can seek
 * even when its static host does not support partial-file requests. Personal
 * footage retains its private streaming URL. */
export function AnnotationVideo({source,localTrial,video,onTime,onError,dimensions,onReady,onProgress}:{source:string;localTrial:boolean;video:RefObject<HTMLVideoElement|null>;onTime:()=>void;onError:(message:string)=>void;dimensions?:{width?:number;height?:number};onReady?:()=>void;onProgress?:(value:number|null)=>void}){
 const [localSource,setLocalSource]=useState(''),[loadError,setLoadError]=useState('');
 useEffect(()=>{
  if(!localTrial)return;setLocalSource('');setLoadError('');
  const controller=new AbortController();let objectUrl='';let disposed=false;
  void fetch(source,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('The trial video could not download. Reload to try again.');
   const chunks:Uint8Array<ArrayBuffer>[]=[];const total=Number(response.headers.get('content-length'));let received=0;
   if(response.body){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;chunks.push(new Uint8Array(value));received+=value.length;onProgress?.(total?Math.min(95,30+received/total*65):null);}}
   const clip=response.body?new Blob(chunks,{type:'video/mp4'}):await response.blob();if(disposed)return;
   objectUrl=URL.createObjectURL(clip);setLocalSource(objectUrl);
  }).catch(error=>{if(!disposed&&error.name!=='AbortError'){setLoadError(error.message);onError('The sample video could not download. Try again.');}});
  return()=>{disposed=true;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[source,localTrial]);
 const ratio=dimensions?.width&&dimensions?.height?dimensions.width/dimensions.height:16/9;
 return <><video crossOrigin="anonymous" style={localTrial?{aspectRatio:String(ratio)}:{width:'100%',height:'100%',objectFit:'contain'}} ref={video} src={localTrial?(localSource||undefined):source} controls={!localTrial} poster={localTrial?'/images/trial-0.png':undefined} preload={localTrial?'auto':'metadata'} onLoadedData={onReady} onTimeUpdate={onTime} onError={()=>onError('The video could not play. Try an H.264 MP4.')}/>{localTrial&&!localSource&&<p className="trial-media-status" role={loadError?'alert':'status'}>{loadError||'Loading trial video…'}</p>}</>;
}
