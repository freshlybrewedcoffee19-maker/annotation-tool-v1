import {useEffect,useRef,useState} from 'react';
import {useMutation} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {cleanShape,type Shape,type SavedShape} from './model';
type Pending={shape:Shape;revision:number;operation:string;ack?:number;error?:string};
export function useShapeQueue(workspaceToken:string,episodeId:Id<'episodes'>,server:SavedShape[]|undefined){
 const key=`cv-v2-queue-${workspaceToken}-${episodeId}`,save=useMutation(api.v2.save);
 const [queue,setQueue]=useState<Pending[]>(()=>{try{return JSON.parse(localStorage.getItem(key)??'[]');}catch{return [];}}),[storageError,setStorageError]=useState(''),[online,setOnline]=useState(navigator.onLine);
 const latest=useRef(queue);latest.current=queue;const running=useRef(false),mounted=useRef(true);
 function write(next:Pending[]){try{localStorage.setItem(key,JSON.stringify(next));latest.current=next;setQueue(next);setStorageError('');return true;}catch{setStorageError('This device could not save your edit. Export a backup or free browser storage before continuing.');return false;}}
 useEffect(()=>{mounted.current=true;const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{mounted.current=false;window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{if(!server)return;const next=latest.current.filter(p=>!p.ack||!server.some(s=>s.key===p.shape.key&&s.revision>=p.ack!));if(next.length!==latest.current.length)write(next);},[server]);
 useEffect(()=>{if(!online||running.current||!server)return;const p=queue.find(p=>!p.ack&&!p.error);if(!p)return;running.current=true;
 void save({workspaceToken,episodeId,shape:p.shape,revision:p.revision}).then(ack=>{if(mounted.current)write(latest.current.map(q=>q.operation===p.operation?{...q,ack}:q));}).catch(e=>{if(mounted.current)write(latest.current.map(q=>q.operation===p.operation?{...q,error:e instanceof Error?e.message:'Could not upload this edit.'}:q));}).finally(()=>{running.current=false;if(mounted.current)setQueue([...latest.current]);});
 },[queue,online,server,save,workspaceToken,episodeId]);
 function enqueue(shape:Shape,revision:number){if(latest.current.some(p=>p.shape.key===shape.key))return false;return write([...latest.current,{shape:cleanShape(shape),revision,operation:crypto.randomUUID()}]);}
 const combined=new Map((server??[]).map(s=>[s.key,s]));for(const p of queue)combined.set(p.shape.key,{...p.shape,revision:p.ack??p.revision,status:'pending',deleted:false});
 return {rows:[...combined.values()].filter(s=>!s.deleted),enqueue,pending:queue,online,storageError,retry:()=>write(latest.current.map(({error,...q})=>q)),discard:(operation:string)=>write(latest.current.filter(q=>q.operation!==operation))};
}
