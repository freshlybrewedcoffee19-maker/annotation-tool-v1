import {useEffect,useState} from 'react';
import type {CardData} from './types';
import {message} from './types';
export function ExportFeedback({data,selected,recording,pending,base=location.href,expanded=false}:{data:CardData;selected:string|null;recording:boolean;pending:number;base?:string;expanded?:boolean}){
 const [scope,setScope]=useState('selected'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [prepared,setPrepared]=useState<{key:string;docx:string;xlsx:string}|null>(null),[preparationError,setPreparationError]=useState<{key:string;text:string}|null>(null);
 const versionId=scope==='all'?'all':selected??'',count=data.feedback.filter(row=>versionId==='all'||row.versionId===versionId).length;
 const filename=`cheddar-vox-feedback-${scope==='all'?'all-versions':'version-'+(data.versions.find(version=>version.id===selected)?.number??'selected')}`;
 // A value snapshot also notices in-place sample edits without rebuilding files on every render.
 const preparationKey=expanded&&count?JSON.stringify({data,versionId,base}):'';
 const ready=preparationKey&&prepared?.key===preparationKey?prepared:null,prepareError=preparationError?.key===preparationKey?preparationError.text:'';
 useEffect(()=>{
  setPrepared(null);setPreparationError(null);
  if(!preparationKey)return;
  let cancelled=false;
  const urls:string[]=[];
  void import('./office-export').then(exporter=>{
   if(cancelled)return;
   const snapshot=JSON.parse(preparationKey) as {data:CardData;versionId:string;base:string};
   const docx=URL.createObjectURL(exporter.wordFeedback(snapshot.data,snapshot.versionId,snapshot.base));urls.push(docx);
   const xlsx=URL.createObjectURL(exporter.excelFeedback(snapshot.data,snapshot.versionId,snapshot.base));urls.push(xlsx);
   setPrepared({key:preparationKey,docx,xlsx});
  }).catch(error=>{
   urls.forEach(url=>URL.revokeObjectURL(url));urls.length=0;
   if(!cancelled)setPreparationError({key:preparationKey,text:'Export failed. '+message(error)+' Your saved feedback is unchanged.'});
  });
  return()=>{cancelled=true;urls.forEach(url=>URL.revokeObjectURL(url));};
 },[preparationKey]);
 async function download(format:'docx'|'xlsx'){setBusy(true);setError('');try{const exporter=await import('./office-export');const blob=format==='docx'?exporter.wordFeedback(data,versionId,base):exporter.excelFeedback(data,versionId,base),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`cheddar-vox-feedback-${scope==='all'?'all-versions':'version-'+(data.versions.find(version=>version.id===selected)?.number??'selected')}.${format}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){setError('Export failed. '+message(error)+' Your saved feedback is unchanged.');}finally{setBusy(false);}}
 const content=<div><label>Versions to export<select value={scope} disabled={busy} onChange={event=>setScope(event.target.value)}><option value="selected">Selected version</option><option value="all">All versions</option></select></label><div className="marketing-actions">{expanded?ready?<><a className="feedback-download-link" href={ready.xlsx} download={`${filename}.xlsx`}>Download Excel</a><a className="feedback-download-link" href={ready.docx} download={`${filename}.docx`}>Download Word</a></>:<><button disabled>Download Excel</button><button disabled>Download Word</button></>:<><button disabled={busy||!count} onClick={()=>void download('docx')}>Word (.docx)</button><button disabled={busy||!count} onClick={()=>void download('xlsx')}>Excel (.xlsx)</button></>}</div>{expanded&&count>0&&!ready&&!prepareError&&<p role="status">Preparing files…</p>}<p>{count?`${count} saved feedback item${count===1?'':'s'} selected.`:'No saved feedback to export for this selection.'}</p>{(recording||pending>0)&&<p role="status">Feedback that is recording, queued or saving must finish saving before it can be included. This export includes saved feedback only.</p>}<p>Links require an internet connection and current access. They may expire or be revoked.</p>{(expanded?prepareError:error)&&<p role="alert">{expanded?prepareError:error}</p>}</div>;
 return expanded?<section className="marketing-office-export feedback-office-expanded" aria-label="Download feedback">{content}</section>:<details className="marketing-office-export"><summary>Export feedback</summary>{content}</details>;
}
