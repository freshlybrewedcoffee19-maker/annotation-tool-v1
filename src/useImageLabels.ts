import {useMutation} from 'convex/react';
import {useEffect,useRef,useState} from 'react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {imageSpeechResults} from './image-labels';
export type ImageSave={key:string;episodeId:Id<'episodes'>;filename:string;label:string;state:'saving'|'failed';error?:string};
export function useImageLabelSaves(workspaceToken:string){
 const queueKey='cv-image-saves-'+workspaceToken;
 const save=useMutation(api.images.save),[items,setItems]=useState<ImageSave[]>(()=>{try{return (JSON.parse(localStorage.getItem(queueKey)??'[]') as ImageSave[]).map(item=>({...item,state:'failed',error:'The previous save was interrupted. Retry to check and save it.'}));}catch{return [];}});const inflight=useRef(new Set<string>());
 useEffect(()=>{localStorage.setItem(queueKey,JSON.stringify(items));},[items,queueKey]);
 async function persist(item:ImageSave){if(inflight.current.has(item.key))return;inflight.current.add(item.key);setItems(rows=>[...rows.filter(r=>r.key!==item.key),{...item,state:'saving',error:undefined}]);try{await save({workspaceToken,episodeId:item.episodeId,label:item.label,clientKey:item.key,source:'voice'});setItems(rows=>rows.filter(r=>r.key!==item.key));}catch(e){setItems(rows=>rows.map(r=>r.key===item.key?{...r,state:'failed',error:e instanceof Error?e.message:'Could not save.'}:r));}finally{inflight.current.delete(item.key);}}
 return {items,add:(episodeId:Id<'episodes'>,filename:string,label:string)=>void persist({key:crypto.randomUUID(),episodeId,filename,label,state:'saving'}),retry:(item:ImageSave)=>void persist(item)};
}
type Recognition={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null;onresult:((e:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function useImageVoice(active:boolean,save:(label:string)=>void){
 const [listening,setListening]=useState(false),[heard,setHeard]=useState(''),[error,setError]=useState('');const recognition=useRef<Recognition|null>(null),wanted=useRef(false),latest=useRef(save);latest.current=save;
 const Speech=(window as SpeechWindow).SpeechRecognition??(window as SpeechWindow).webkitSpeechRecognition;
 function stop(){wanted.current=false;const r=recognition.current;recognition.current=null;if(r){r.onstart=null;r.onend=null;r.onresult=null;r.onerror=null;r.abort();}setListening(false);}
 useEffect(()=>{if(!active)stop();return stop;},[active]);
 function toggle(){if(wanted.current){stop();return;}if(!active||!Speech)return;setError('');const r=new Speech();recognition.current=r;wanted.current=true;r.continuous=true;r.interimResults=true;r.lang='en-US';
  const engine=imageSpeechResults(label=>latest.current(label));const current=()=>wanted.current&&recognition.current===r;
  r.onstart=()=>{if(current()){engine.reset();setListening(true);}};
  r.onresult=e=>{if(!current())return;for(let i=e.resultIndex;i<e.results.length;i++){const result=e.results[i];setHeard(result[0].transcript);engine.result(i,result[0].transcript,result.isFinal);}};
  r.onerror=e=>{if(e.error==='no-speech')return;stop();setError(e.error==='not-allowed'?'Allow microphone access in Chrome, then try again.':'Speech recognition stopped. Turn the mic on to try again.');};
  r.onend=()=>{if(current()){try{r.start();}catch{stop();setError('Turn the mic on to try again.');}}};
  try{r.start();}catch{stop();setError('The microphone could not start. Try again.');}
 }
 return {listening,heard,error,toggle,available:!!Speech};
}
