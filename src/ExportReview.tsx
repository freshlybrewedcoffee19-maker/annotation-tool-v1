import {useState} from 'react';
import {coverage,type Interval} from './coverage';
import {segmentId,boundaryFrame} from './segment-record';
import {csv,downloadText} from './csv';
type Record=Interval&{_id:string;segmentNumber?:number;label:string;source?:string};
export function ExportReview({episode,segments,next}:{episode:{name:string;duration:number;frameRate?:number|null};segments:Record[];next:()=>void}){
 const checks=coverage(episode.duration,segments);const [message,setMessage]=useState('');
 function richExport(){downloadText('episode-segments.csv',csv(['episode','annotation_id','label','start_sec','end_sec','duration_sec','start_frame','end_frame','source'],segments.map(r=>[episode.name,segmentId(r),r.label,r.start_sec,r.end_sec,r.end_sec-r.start_sec,boundaryFrame(r.start_sec,episode.frameRate),boundaryFrame(r.end_sec,episode.frameRate),r.source??'Not recorded'])));setMessage('Episode CSV exported. Saved work is kept.');}
 return <section className="export-review" aria-label="Export review"><h2>Export review</h2><p>{segments.length} saved segment(s) · Coverage: {checks.percent.toFixed(1)}%</p><p>{checks.pass?'Coverage pass: ready to export.':`Coverage warning: ${checks.gaps.length} gap(s), ${checks.overlaps.length} overlap(s). You can still export.`}</p><p>The header CSV and JSON keep their original four columns. Episode CSV adds IDs, duration, frames and source.</p><button type="button" onClick={richExport}>Export episode CSV</button><button type="button" onClick={next}>Annotate next video</button>{message&&<p role="status">{message}</p>}</section>;
}
