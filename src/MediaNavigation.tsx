import type {Id} from '../convex/_generated/dataModel';
export function MediaNavigation<T extends string=Id<'episodes'>>({files,selected,choose,disabled,selectLabel='Current media file'}:{files:{_id:T;name:string;mediaType?:'image'|'video'}[];selected:T;choose:(id:T)=>void;disabled:boolean;selectLabel?:string}){
 const index=files.findIndex(f=>f._id===selected);if(index<0)return null;
 return <nav className="media-navigation" aria-label="Media files"><button disabled={disabled||index===0} onClick={()=>choose(files[index-1]._id)}>Previous file</button><label>File<select aria-label={selectLabel} disabled={disabled} value={selected} onChange={e=>choose(e.target.value as T)}>{files.map(f=><option value={f._id} key={f._id}>{f.name} · {f.mediaType==='image'?'Image':'Video'}</option>)}</select></label><span>{index+1} / {files.length}</span><button disabled={disabled||index===files.length-1} onClick={()=>choose(files[index+1]._id)}>Next file</button></nav>;
}
