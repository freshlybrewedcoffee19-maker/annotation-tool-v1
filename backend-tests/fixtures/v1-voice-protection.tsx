// Real V1 controls; only account/network hooks and browser speech/media are controlled.
// The Node test connects these hooks to the real Convex functions in memory.
import {useCallback,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {getFunctionName} from 'convex/server';
import {api} from '../../convex/_generated/api';
import {VoiceLabels} from '../../src/VoiceLabels';
import {ReviewDeck} from '../../src/ReviewDeck';
import {TrialPlayer} from '../../src/TrialPlayer';
import {ExportReview} from '../../src/ExportReview';
import {configureProductTracking} from '../../src/product-tracking';

const config=(window as any).fixtureConfig;
type Entry={name:string;args:any;value:any;listeners:Set<()=>void>};
const queries=new Map<string,Entry>();
const bridge=(kind:string,name:string,args:any)=>(window as any).fixtureBackend(kind,name,args);
async function load(entry:Entry){entry.value=await bridge('query',entry.name,entry.args);entry.listeners.forEach(listener=>listener());}
async function refresh(){await Promise.all([...queries.values()].map(load));}
export const useFixtureWorkspace=()=>({workspaceToken:config.workspaceToken,kind:'trial'});
export function useFixtureQuery(reference:any,args:any){
 const name=getFunctionName(reference),key=JSON.stringify([name,args]);
 if(!queries.has(key)){const entry={name,args,value:undefined,listeners:new Set<()=>void>()};queries.set(key,entry);void load(entry);}
 const entry=queries.get(key)!;
 return useSyncExternalStore(useCallback((listener:()=>void)=>{entry.listeners.add(listener);return()=>{entry.listeners.delete(listener);};},[entry]),()=>entry.value);
}
export function useFixtureMutation(reference:any){
 const name=getFunctionName(reference);
 return useCallback(async(args:any)=>{const result=await bridge('mutation',name,args);await refresh();return result;},[name]);
}
configureProductTracking(()=>Promise.resolve(null));
class Speech {
 continuous=false;interimResults=false;lang='';
 onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:any=null;onresult:any=null;
 constructor(){recognition=this;}
 start(){this.onstart?.();}
 stop(){this.onend?.();}
 abort(){}
}
let recognition:Speech;
(window as any).SpeechRecognition=Speech;
const player=Object.assign(new EventTarget(),{currentTime:0,duration:30,paused:true,play:async()=>{player.paused=false;player.dispatchEvent(new Event('play'));},pause:()=>{player.paused=true;player.dispatchEvent(new Event('pause'));}});
const video={current:player as unknown as HTMLVideoElement};
function Fixture(){
 const segments=useFixtureQuery(api.annotations.segments,{workspaceToken:config.workspaceToken,episodeId:config.episodeId})??[];
 return <>
  <VoiceLabels episodeId={config.episodeId} labels={[]} video={video} compact videoOnly/>
  <TrialPlayer video={video} frameRate={30} episodeId={config.episodeId} active videoOnly/>
  <ReviewDeck episode={{name:'Voice trial.mp4',url:null}} segments={segments} edit={()=>{}}/>
  <ExportReview episode={{name:'Voice trial.mp4',duration:30,frameRate:30}} segments={segments} next={()=>{}}/>
  <output aria-label="Saved segment count">{segments.length}</output>
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
(window as any).v1Fixture={
 result(text:string,final:boolean,index:number,time?:number){
  if(time!==undefined){player.currentTime=time;player.dispatchEvent(new Event('timeupdate'));}
  const results:any[]=Array.from({length:index+1},()=>({isFinal:true,0:{transcript:''}}));
  results[index]={isFinal:final,0:{transcript:text}};
  recognition.onresult?.({resultIndex:index,results});
 },
 snapshot(){return {paused:player.paused,time:player.currentTime};},
};
