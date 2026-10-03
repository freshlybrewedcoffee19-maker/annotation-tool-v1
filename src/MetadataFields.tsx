import {useWorkspace} from './workspace';
import {useState} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
export function MetadataFields({episode}:{episode:{_id:Id<'episodes'>;metadata?:{field:string;value:string}[];metadataLocks?:string[]}}){
 const {workspaceToken}=useWorkspace();
 const unlock=useMutation(api.metadata.unlockField);
 const fields=useQuery(api.metadata.list,{workspaceToken}),saveFields=useMutation(api.metadata.saveFields),saveValues=useMutation(api.metadata.saveValues);
 const [text,setText]=useState<string|null>(null),[draft,setDraft]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const saved=new Map((episode.metadata??[]).map(row=>[row.field,row.value]));const value=(field:string)=>Object.hasOwn(draft,field)?draft[field]:saved.get(field)??'';
 async function act(fn:()=>Promise<unknown>,success:string){setBusy(true);try{await fn();setMessage(success);}catch(error){setMessage(error instanceof Error?error.message:'Could not save metadata.');}finally{setBusy(false);}}
 return <section className="metadata-fields" aria-label="Custom metadata"><h2>Your metadata fields</h2><p>One field per line. Removing a field hides it; saved values are kept.</p><label>Metadata field list<textarea aria-label="Metadata field list" value={text??fields?.join('\n')??''} onChange={e=>setText(e.target.value)} disabled={busy||fields===undefined}/></label><button type="button" disabled={busy||fields===undefined} onClick={()=>void act(async()=>{await saveFields({workspaceToken,text:text??fields?.join('\n')??''});setText(null);},'Metadata fields saved.')}>Save metadata fields</button><h3>Values for this video</h3>{fields?.length?<form onSubmit={e=>{e.preventDefault();void act(async()=>{await saveValues({workspaceToken,episodeId:episode._id,values:fields.map(field=>({field,value:value(field)}))});setDraft({});},'Metadata values saved.');}}>{fields.map(field=><label key={field}>{field}<input aria-label={`Metadata: ${field}`} value={value(field)} disabled={episode.metadataLocks?.includes(field)} onChange={e=>setDraft(old=>({...old,[field]:e.target.value}))}/>{episode.metadataLocks?.includes(field)&&<button type="button" disabled={busy} onClick={()=>void act(()=>unlock({workspaceToken,episodeId:episode._id,field}),"Field unlocked for this video.")}>Unlock {field} for this video</button>}</label>)}<button disabled={busy}>Save metadata values</button></form>:<p>No metadata fields yet. Add your own above, or continue without metadata.</p>}<p role="status">{message}</p></section>;
}
