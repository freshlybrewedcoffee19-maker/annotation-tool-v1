import {useState} from 'react';
export function EditableSampleName({id,name}:{id:string;name:string}){
 const key=`cv-sample-name-${id}`;
 const [saved,setSaved]=useState(()=>localStorage.getItem(key)||name);
 const [draft,setDraft]=useState(saved);
 function commit(){const next=draft.trim()||saved;setDraft(next);setSaved(next);localStorage.setItem(key,next);}
 return <span className="trial-sample-filename">Sample · <input aria-label="Sample video name" value={draft} maxLength={150} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){setDraft(saved);}}} style={{width:`${Math.max(12,Math.min(40,draft.length+1))}ch`}}/></span>;
}

