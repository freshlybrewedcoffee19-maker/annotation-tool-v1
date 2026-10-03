import {useWorkspace} from './workspace';
import {useState} from 'react';
import {useQuery,useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
type Default={field:string;value:string;locked:boolean};
export function MetadataDefaults(){
 const {workspaceToken}=useWorkspace();
 const fields=useQuery(api.metadata.list,{workspaceToken}),defaults=useQuery(api.metadata.defaults,{workspaceToken}),save=useMutation(api.metadata.saveDefaults);
 const [draft,setDraft]=useState<Record<string,Default>>({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const entry=(field:string)=>Object.hasOwn(draft,field)?draft[field]:defaults?.find(row=>row.field===field)??{field,value:'',locked:false};
 function update(field:string,change:Partial<Default>){setDraft(old=>({...old,[field]:{...entry(field),...change}}));}
 return <section className="metadata-defaults" aria-label="Metadata defaults"><h2>Reusable defaults</h2><p>Locked defaults fill new videos. Changing defaults never changes existing videos.</p>{fields?.length?<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await save({workspaceToken,values:fields.map(entry)});setDraft({});setMessage('Metadata defaults saved.');}catch(error){setMessage(error instanceof Error?error.message:'Could not save defaults.');}finally{setBusy(false);}}}>{fields.map(field=><div key={field}><label>Default: {field}<input aria-label={`Default: ${field}`} value={entry(field).value} onChange={e=>update(field,{value:e.target.value})}/></label><label className="lock-default"><input type="checkbox" aria-label={`Lock default: ${field}`} checked={entry(field).locked} onChange={e=>update(field,{locked:e.target.checked})}/>Lock for new videos</label></div>)}<button disabled={busy||defaults===undefined}>Save metadata defaults</button></form>:<p>Add your own metadata fields to set defaults.</p>}<p role="status">{message}</p></section>;
}
