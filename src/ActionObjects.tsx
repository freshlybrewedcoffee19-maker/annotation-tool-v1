import {useState} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Doc,Id} from '../convex/_generated/dataModel';
import {useWorkspace} from './workspace';

export function ActionObjectSummary({row}:{row:Doc<'segments'>}){
 const {workspaceToken}=useWorkspace();const objects=useQuery(api.boxes.objects,{workspaceToken,episodeId:row.episodeId});
 if(!row.objectIds?.length)return null;
 return <p>Linked objects: {row.objectIds.map(id=>{const o=objects?.find(o=>o.objectId===id);return `${o?.name??'Object'} · ${id.slice(0,8)}`;}).join(', ')}. Visibility throughout this action: <strong>Needs checking</strong>.</p>;
}

export function ActionObjects({episodeId,segments}:{episodeId:Id<'episodes'>;segments:Doc<'segments'>[]}){
 const {workspaceToken}=useWorkspace();const objects=useQuery(api.boxes.objects,{workspaceToken,episodeId});const shapes=useQuery(api.boxes.list,{workspaceToken,episodeId});
 const [selected,setSelected]=useState('');const row=segments.find(s=>s._id===selected)??segments[0];
 return <details className="action-objects"><summary>Link objects to actions</summary><p>Choose a saved action, including one recorded by voice, then select the objects involved. Draw a named box or polygon first to create an object.</p>
 {segments.length?<><label>Action<select aria-label="Action to link" value={row?._id??''} onChange={e=>setSelected(e.target.value)}>{segments.map(s=><option key={s._id} value={s._id}>{s.label} · {s.start_sec}–{s.end_sec} sec</option>)}</select></label>{row&&<LinkEditor key={row._id} row={row} objects={objects??[]} loaded={objects!==undefined} shapes={shapes??[]}/>}
 <button disabled={objects===undefined||shapes===undefined} onClick={()=>{
 const actions=segments.filter(s=>s.reviewStatus!=='disqualified').map(s=>({id:s._id,label:s.label,start_sec:s.start_sec,end_sec:s.end_sec,source:s.source??'manual',reviewStatus:s.reviewStatus??'pending',objectIds:s.objectIds??[],visibilityStatus:(s.objectIds?.length?'needs_checking':'not_linked')}));
 const used=new Set(actions.flatMap(s=>s.objectIds));const data={format:'naive-physics-actions',version:1,episodeId,coordinateSpace:'normalized-video',actions,objects:(objects??[]).filter(o=>used.has(o.objectId)),observations:(shapes??[]).filter(s=>used.has(s.objectId)&&s.reviewStatus!=='disqualified').map(s=>({...s,shape:s.points?'polygon':'box',reviewStatus:s.reviewStatus??'pending'}))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='object-linked-actions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }}>Export linked actions JSON</button></>:<p>Add an action segment to begin.</p>}</details>;
}
function LinkEditor({row,objects,loaded,shapes}:{row:Doc<'segments'>;objects:{objectId:string;name:string}[];loaded:boolean;shapes:{objectId:string;time:number;reviewStatus?:string}[]}){
 const {workspaceToken}=useWorkspace();const save=useMutation(api.annotations.linkObjects);const [draft,setDraft]=useState<string[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const ids=draft??row.objectIds??[];
 return <div><fieldset disabled={busy||!loaded}><legend>Objects involved (optional)</legend>{!objects.length?<p>No saved objects yet.</p>:objects.map(o=><label key={o.objectId} className="object-choice"><input type="checkbox" aria-label={`Link ${o.name} ${o.objectId.slice(0,8)}`} checked={ids.includes(o.objectId)} onChange={e=>{setMessage('');setDraft(e.target.checked?[...ids,o.objectId]:ids.filter(id=>id!==o.objectId));}}/>{o.name} · {o.objectId.slice(0,8)}</label>)}</fieldset>
 <button disabled={busy||!loaded||draft===null} onClick={async()=>{setBusy(true);setError('');setMessage('');try{await save({workspaceToken,id:row._id,objectIds:ids});setDraft(null);setMessage('Object links saved.');}catch(e){setError(e instanceof Error?e.message:'Links could not save. Try again.');}finally{setBusy(false);}}}>Save object links</button>
 {busy&&<p role="status">Saving object links…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 {(row.objectIds??[]).map(id=>{const o=objects.find(o=>o.objectId===id);const samples=shapes.filter(s=>s.objectId===id&&s.time>=row.start_sec&&s.time<=row.end_sec&&s.reviewStatus!=='disqualified');return <p key={id}>{o?.name??'Unavailable object'} · {id.slice(0,8)}: {samples.length} saved frame samples in this action. <strong>Needs checking</strong> — frame samples do not confirm visibility throughout the action.</p>;})}
 </div>;
}
