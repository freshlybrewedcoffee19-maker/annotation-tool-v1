import {useEffect,useRef,useState} from 'react';
import {useAction,useConvexAuth,useMutation,useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {newWorkspaceToken,useWorkspace} from '../workspace';
import {SignIn} from '../SignIn';
import {VideoEditor} from './VideoEditor';
import './workspace.css';

async function metadata(file:File){return new Promise<{duration:number;width:number;height:number}>((resolve,reject)=>{
 const v=document.createElement('video'),url=URL.createObjectURL(file);let done=false;
 const finish=(error?:string)=>{if(done)return;done=true;clearTimeout(timer);URL.revokeObjectURL(url);v.removeAttribute('src');v.load();error?reject(Error(error)):resolve(result);};
 let result={duration:0,width:0,height:0};const timer=setTimeout(()=>finish('This video did not open. Try an H.264 MP4.'),15000);
 v.onloadedmetadata=()=>{result={duration:v.duration,width:v.videoWidth,height:v.videoHeight};finish(Number.isFinite(v.duration)&&v.duration>0&&v.videoWidth>0?undefined:'This video has no playable picture or duration.');};v.onerror=()=>finish('This video cannot play. Try an H.264 MP4.');v.preload='metadata';v.src=url;
});}
export function VersionTwo(){
 const {workspaceToken,ready,kind,switchWorkspace,connectionError}=useWorkspace(),{isAuthenticated,isLoading}=useConvexAuth();
 const account=useQuery(api.accounts.workspace,isAuthenticated?{}:'skip'),claim=useMutation(api.accounts.claimWorkspace),sample=useMutation(api.v2.sample),begin=useAction(api.r2.begin),complete=useAction(api.r2.complete),playback=useAction(api.r2.playback);
 const videos=useQuery(api.v2.videos,ready?{workspaceToken}:'skip'),[selected,setSelected]=useState<string|null>(()=>localStorage.getItem('cv-v2-selected-'+workspaceToken)),[signing,setSigning]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[retry,setRetry]=useState(0),[uploadStatus,setUploadStatus]=useState('');
 const claiming=useRef(false),episode=videos?.find(v=>v.id===selected);
 useEffect(()=>{if(!isAuthenticated||!ready||account===undefined||claiming.current)return;
  if(account){localStorage.setItem('cv-account-workspace',account);if(account!==workspaceToken)switchWorkspace(account);return;}
  claiming.current=true;const token=kind==='trial'?newWorkspaceToken():workspaceToken;void claim({workspaceToken:token}).then(()=>{localStorage.setItem('cv-account-workspace',token);if(token!==workspaceToken)switchWorkspace(token);}).catch(()=>setError('Could not open your account workspace. Refresh to try again.')).finally(()=>{claiming.current=false;});
 },[isAuthenticated,account,ready,workspaceToken,kind]);
 useEffect(()=>{let alive=true;setUrl('');if(!episode)return;if(episode.sample){setUrl(import.meta.env.VITE_TRIAL_VIDEO_PATH||'/videos/iron-e05a44b0.mp4');return;}
  const refresh=()=>void playback({workspaceToken,episodeId:episode.id}).then(next=>{if(alive&&next)setUrl(next);}).catch(()=>{if(alive)setError('Could not open your private video. Retry below.');});refresh();const timer=setInterval(refresh,25*60*1000);return()=>{alive=false;clearInterval(timer);};
 },[episode?.id,workspaceToken,retry]);
 function choose(id:Id<'episodes'>|null){setSelected(id);if(id)localStorage.setItem('cv-v2-selected-'+workspaceToken,id);else localStorage.removeItem('cv-v2-selected-'+workspaceToken);}
 async function act(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Could not finish. Try again.');}finally{setBusy(false);}}
 async function upload(files:File[]){if(!isAuthenticated){setSigning(true);return;}await act(async()=>{
  if(files.length>20)throw Error('Choose up to 20 videos at a time.');let first:Id<'episodes'>|undefined,saved=0;
  try{for(const file of files){const extension=file.name.split('.').at(-1)?.toLowerCase();if(!['mp4','mov','webm'].includes(extension??''))throw Error(`${file.name}: choose MP4, MOV or WebM.`);if(file.size>250_000_000)throw Error(`${file.name}: current uploads allow up to 250 MB per video.`);
   setUploadStatus(`Uploading ${saved+1} of ${files.length}: ${file.name}`);const info=await metadata(file),mime=extension==='mov'?'video/quicktime':extension==='webm'?'video/webm':'video/mp4';const pending=await begin({workspaceToken,name:file.name,size:file.size,mime,...info,version:2});
   const put=await fetch(pending.url,{method:'PUT',headers:{'Content-Type':mime},body:file});if(!put.ok)throw Error(`${file.name}: upload failed. Retry this file.`);const id=await complete({workspaceToken,uploadId:pending.uploadId});first??=id;saved++;
  }}catch(e){throw Error(`${saved} video(s) saved. ${e instanceof Error?e.message:'Upload failed.'} Add the remaining files again.`);}finally{setUploadStatus('');}if(first)choose(first);
 });}
 if(signing&&!isAuthenticated)return <SignIn back={()=>setSigning(false)} done={()=>setSigning(false)}/>;
 if(!ready||isLoading||isAuthenticated&&account===undefined)return <main className="v2-home"><h1>Version 2</h1><p role="status">{connectionError||'Opening your workspace…'}</p><a href="/">Return to Version 1</a></main>;
 if(episode&&url)return <VideoEditor key={episode.id} episode={episode} source={url} back={()=>choose(null)}/>;
 return <main className="v2-home"><header className="v2-header"><a className="brand" href="/">Cheddar Vox</a><a href="/workspace">Version 1</a></header><section className="v2-intro"><h1>Your video.<br/>Your voice. Your labels.</h1><p>Version 2 workspace · Start with a sample or upload footage. Draw on paused frames, label moments with your voice, then swipe through your review.</p><div className="v2-start"><button className="primary" disabled={busy||videos===undefined} onClick={()=>void act(async()=>choose(await sample({workspaceToken})))}>Try a V2 sample</button>{isAuthenticated?<label className="v2-upload">{busy?'Uploading…':'Upload videos'}<input type="file" aria-label="Upload V2 videos" accept=".mp4,.mov,.webm,video/mp4,video/webm,video/quicktime" multiple disabled={busy} onChange={e=>{const files=[...e.target.files??[]];e.target.value='';if(files.length)void upload(files);}}/></label>:<button onClick={()=>setSigning(true)}>Sign in to upload</button>}</div><p className="v2-instructions">Try this: pause the sample, choose Bounding box, draw around an object and save. Turn on the mic to say “start”, “stop”, then an action label.</p></section>{error&&<p role="alert" className="error">{error}</p>}{uploadStatus&&<p role="status">{uploadStatus}</p>}{episode&&!url&&<section><p role="status">Opening video…</p><button onClick={()=>setRetry(n=>n+1)}>Retry opening video</button><button onClick={()=>choose(null)}>Back to videos</button></section>}<section className="v2-video-list"><h2>Your V2 videos</h2>{videos===undefined?<p role="status">Loading videos…</p>:!videos.length?<p>No videos yet. Your Version 1 projects are kept separately.</p>:<ul>{videos.map(v=><li key={v.id}><button disabled={busy} onClick={()=>choose(v.id)}><strong>{v.name}</strong><span>{v.duration.toFixed(1)} sec · {v.sample?'Sample':'Private video'}</span></button></li>)}</ul>}</section><footer>Video tools are being built in stages. Your existing voice controls and swipe review are retained. <a href="/licenses/cvat-MIT.txt">Open-source notices</a></footer></main>;
}
