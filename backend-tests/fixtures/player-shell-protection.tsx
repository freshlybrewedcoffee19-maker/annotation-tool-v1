// The production editor and all its tool panels run here. Only the network and
// decoded media boundary are controlled; nothing reaches a server or microphone.
import {useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {getFunctionName} from 'convex/server';
import {ObjectBoxes} from '../../src/ObjectBoxes';
import {VoiceVideoWorkspace} from '../../src/VoiceVideoWorkspace';
import {TrialTracks} from '../../src/TrialTracks';
import type {Activity} from '../../src/ActivityNavigation';

const empty:unknown[]=[];
const history={undo:{id:'previous-edit',description:'Add voice tag'},redo:{id:'next-edit',description:'Add voice tag'}};
const drawingHistory={undo:{id:'previous-outline',description:'Edit outlines'},redo:{id:'next-outline',description:'Edit outlines'}};
const calls:{name:string;args:unknown}[]=[];
const queryNames=new Set<string>();
const mutations=new Map<string,(args:unknown)=>Promise<unknown>>();
let microphoneMounts=0,microphoneUnmounts=0;
let element:HTMLVideoElement|null=null,position=0,paused=true;
export const useTestWorkspace=()=>({workspaceToken:'isolated-player-workspace',kind:'trial'});
export function useTestQuery(reference:any){
 const name=getFunctionName(reference);
 queryNames.add(name);
 if(name==='trialHistory:status')return location.hash==='#voice-trial-outlines'?drawingHistory:history;
 if(['boxes:list','boxes:objects','visibility:list','masks:list','tracks:list'].includes(name))return empty;
 throw Error('Unexpected editor query: '+name);
}
export function useTestMutation(reference:any){
 const name=getFunctionName(reference);
 if(!mutations.has(name))mutations.set(name,async(args:unknown)=>{calls.push({name,args});return null;});
 return mutations.get(name)!;
}
const client={query:async()=>{throw Error('This test must not load stored media or model data.');}};
export const useTestConvex=()=>client;
function prepareVideo(video:HTMLVideoElement){
 element=video;
 Object.defineProperties(video,{
  duration:{configurable:true,get:()=>20},paused:{configurable:true,get:()=>paused},
  readyState:{configurable:true,get:()=>4},videoWidth:{configurable:true,get:()=>640},videoHeight:{configurable:true,get:()=>360},
  currentTime:{configurable:true,get:()=>position,set:(value:number)=>{position=value;video.dispatchEvent(new Event('seeking'));video.dispatchEvent(new Event('timeupdate'));video.dispatchEvent(new Event('seeked'));}},
 });
 video.play=async()=>{paused=false;video.dispatchEvent(new Event('play'));};
 video.pause=()=>{paused=true;video.dispatchEvent(new Event('pause'));};
}
function MicrophoneProbe(){
 const [listening,setListening]=useState(false),[draft,setDraft]=useState('');
 useEffect(()=>{microphoneMounts++;return()=>{microphoneUnmounts++;};},[]);
 return <div data-testid="microphone-probe"><button onClick={()=>setListening(value=>!value)}>{listening?'Probe microphone on':'Probe microphone off'}</button><label>Unfinished note<input value={draft} onChange={event=>setDraft(event.target.value)}/></label></div>;
}
const segments=[{_id:'saved-note',label:'Turn left',start_sec:4,end_sec:7},{_id:'discarded-note',label:'Discarded note',start_sec:9,end_sec:10,reviewStatus:'disqualified'}];
function Fixture(){
 const video=useRef<HTMLVideoElement|null>(null),image=useRef<HTMLImageElement|null>(null);
 const attachVideo=useCallback((node:HTMLVideoElement|null)=>{video.current=node;if(node)prepareVideo(node);},[]);
 const [activity,setActivity]=useState<Activity>('actions'),[time,setTime]=useState(0),[selection,setSelection]=useState('');
 const imageMode=location.hash==='#image',trialMode=location.hash==='#trial';
 if(location.hash==='#voice-signed'||location.hash.startsWith('#voice-trial'))return <VoiceVideoWorkspace
  episodeId={'isolated-player-episode' as any} video={video} active frameRate={25}
  trialMode={location.hash.startsWith('#voice-trial')} activity={activity} chooseActivity={setActivity}
  sidebar={<MicrophoneProbe/>} guide={<p>Voice annotation guide</p>} tools={<p data-testid="annotation-tools">Manual annotation options</p>}
  savedAnnotations={<p data-testid="saved-annotations">Turn left: 4–7 seconds</p>}
  timeline={<><TrialTracks duration={20} segments={segments} time={time} select={segment=>{setSelection(segment._id);video.current?.pause();if(video.current)video.current.currentTime=segment.start_sec;}}/><output aria-label="Selected note">{selection}</output></>}
 ><video aria-label="Annotation video" ref={attachVideo} onTimeUpdate={()=>setTime(video.current?.currentTime??0)} style={{width:640,height:360}}/></VoiceVideoWorkspace>;
 return <ObjectBoxes episodeId={'isolated-player-episode' as any} video={video} image={imageMode?image:undefined} active frameRate={25} trialMode={trialMode} activity={activity} chooseActivity={setActivity}
  sidebar={<MicrophoneProbe/>} guide={<p>Voice annotation guide</p>} tools={<p data-testid="annotation-tools">Manual annotation options</p>}
  relationships={<p data-testid="relationships">Existing action and object links</p>}
  savedAnnotations={<p data-testid="saved-annotations">Turn left: 4–7 seconds</p>}
  timeline={<><TrialTracks duration={20} segments={segments} time={time} select={segment=>{setSelection(segment._id);video.current?.pause();if(video.current)video.current.currentTime=segment.start_sec;}}/><output aria-label="Selected note">{selection}</output></>}>
  {imageMode?<img ref={image} alt="Existing uploaded image" style={{width:640,height:360}}/>:<video aria-label="Annotation video" ref={attachVideo} onTimeUpdate={()=>setTime(video.current?.currentTime??0)} style={{width:640,height:360}}/>}
 </ObjectBoxes>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
(window as any).playerProtection={snapshot:()=>({position,paused,calls:[...calls],queryNames:[...queryNames].sort(),microphoneMounts,microphoneUnmounts,hasPlayer:!!element})};
