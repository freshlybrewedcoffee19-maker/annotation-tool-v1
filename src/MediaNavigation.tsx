import type {Id} from '../convex/_generated/dataModel';
export function MediaNavigation({files,selected,choose,disabled}:{files:{_id:Id<'episodes'>;name:string;mediaType?:'image'|'video'}[];selected:Id<'episodes'>;choose:(id:Id<'episodes'>)=>void;disabled:boolean}){
 const index=files.findIndex(f=>f._id===selected);if(index<0)return null;
 return <nav className="media-navigation" aria-label="Media files"><button disabled={disabled||index===0} onClick={()=>choose(files[index-1]._id)}>Previous file</button><label>File<select aria-label="Current media file" disabled={disabled} value={selected} onChange={e=>choose(e.target.value as Id<'episodes'>)}>{files.map(f=><option value={f._id} key={f._id}>{f.name} · {f.mediaType==='image'?'Image':'Video'}</option>)}</select></label><span>{index+1} / {files.length}</span><button disabled={disabled||index===files.length-1} onClick={()=>choose(files[index+1]._id)}>Next file</button></nav>;
}
