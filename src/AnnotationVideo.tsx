import {useEffect,useState,type RefObject} from 'react';

/** The small public trial is loaded once into browser memory so it can seek
 * even when its static host does not support partial-file requests. Personal
 * footage retains its private streaming URL. */
export function AnnotationVideo({source,localTrial,video,onTime,onError}:{source:string;localTrial:boolean;video:RefObject<HTMLVideoElement|null>;onTime:()=>void;onError:(message:string)=>void}){
 const [localSource,setLocalSource]=useState(''),[loadError,setLoadError]=useState('');
 useEffect(()=>{
  if(!localTrial)return;
  const controller=new AbortController();let objectUrl='';let disposed=false;
  void fetch(source,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('The trial video could not download. Reload to try again.');
   const clip=await response.blob();if(disposed)return;
   objectUrl=URL.createObjectURL(clip);setLocalSource(objectUrl);
  }).catch(error=>{if(!disposed&&error.name!=='AbortError')setLoadError(error.message||'The trial video could not download. Reload to try again.');});
  return()=>{disposed=true;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[source,localTrial]);
 return <><video ref={video} src={localTrial?(localSource||undefined):source} controls preload="metadata" onTimeUpdate={onTime} onError={()=>onError('The video could not play. Try an H.264 MP4.')}/>{localTrial&&!localSource&&<p className="trial-media-status" role={loadError?'alert':'status'}>{loadError||'Loading trial video…'}</p>}</>;
}
