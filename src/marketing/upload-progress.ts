export type UploadProgress={loaded:number;total:number};
type UploadResult={ok:boolean;status:number};

/** Send the original file directly, with real byte progress and a stalled-connection escape. */
export function uploadWithProgress(url:string,body:Blob,mime:string,progress:(value:UploadProgress)=>void):Promise<UploadResult>{
 return new Promise((resolve,reject)=>{
  const request=new XMLHttpRequest();let settled=false,stalled:ReturnType<typeof setTimeout>|undefined;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(stalled);request.onload=request.onerror=request.onabort=null;request.upload.onprogress=null;if(error)reject(error);else resolve({ok:request.status>=200&&request.status<300,status:request.status});};
  const watch=()=>{clearTimeout(stalled);stalled=setTimeout(()=>{finish(Error('The upload stopped making progress. Your file is kept; check your connection and retry.'));request.abort();},60000);};
  // Attach before open/send for mobile browser compatibility.
  request.upload.onprogress=event=>{if(settled)return;watch();progress({loaded:Math.min(body.size,event.loaded),total:body.size});};
  request.onload=()=>finish();
  request.onerror=()=>finish(Error('The upload connection was interrupted. Your file is kept; retry below.'));
  request.onabort=()=>finish(Error('The upload was interrupted. Your file is kept; retry below.'));
  try{request.open('PUT',url);request.setRequestHeader('Content-Type',mime);progress({loaded:0,total:body.size});watch();request.send(body);}catch(error){finish(error instanceof Error?error:Error('The upload could not start. Please retry.'));}
 });
}
