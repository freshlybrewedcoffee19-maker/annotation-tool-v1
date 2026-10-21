// Isolated browser fixture: real composer, speech session, autosave and queue.
// Only account/network hooks and the browser speech service are replaced.
import {useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {FeedbackComposer} from '../../src/marketing/FeedbackComposer';
import {FeedbackQueue} from '../../src/marketing/feedback-queue';
import {readDraft,writeDrafts} from '../../src/marketing/drafts';
import type {Recognition} from '../../src/marketing/voice-session';

const account={email:'isolated@example.invalid'};
export const useQuery=()=>account;
export const useSample=()=>null;
const draftKey='feedback:isolated@example.invalid:card:version';
const saved:any[]=[],events:string[]=[],instances:Speech[]=[];
const queue=new FeedbackQueue('isolated-queue',{read:async()=>[],write:writeDrafts});
const originalEnqueue=queue.enqueue.bind(queue);
queue.enqueue=(job,replacement)=>{events.push('enqueue');originalEnqueue(job,replacement);};
queue.bind({upload:async()=>{throw Error('This phone test must not upload audio.');},save:async job=>{saved.push({...job});}});
export function useFeedbackQueue(){useSyncExternalStore(queue.subscribe,queue.snapshot);return queue;}

class Speech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 constructor(){instances.push(this);}
 start(){events.push('start');}
 abort(){events.push('abort');}
}
(window as any).SpeechRecognition=Speech;
const player=Object.assign(new EventTarget(),{currentTime:0,paused:true,playsInline:false,play:async()=>{player.paused=false;},pause:()=>{player.paused=true;}});
const root=createRoot(document.getElementById('root')!);
void queue.init().then(()=>root.render(<FeedbackComposer cardId="card" version={{id:'version',number:1,name:'Isolated',size:1,duration:30,width:100,height:100,uploadedAt:0,uploader:'Test',deleted:false}} video={{current:player as unknown as HTMLVideoElement}} onRecording={()=>{}} compact/>));
(window as any).voiceTest={
 connect(){instances.at(-1)?.onstart?.();},
 result(text:string,final:boolean,index:number,time?:number){if(time!==undefined)player.currentTime=time;const results:any[]=Array.from({length:index+1},()=>({isFinal:true,0:{transcript:''}}));results[index]={isFinal:final,0:{transcript:text}};instances.at(-1)?.onresult?.({resultIndex:index,results});},
 end(){instances.at(-1)?.onend?.();},
 error(error:string){instances.at(-1)?.onerror?.({error});},
 speechStart(){instances.at(-1)?.onspeechstart?.();},
 speechEnd(){instances.at(-1)?.onspeechend?.();},
 hide(){Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));},
 stop(){window.dispatchEvent(new Event('marketing-stop-recording'));},
 unmount(){root.unmount();},
 snapshot(){return {jobs:queue.jobs.map(job=>({...job})),saved:[...saved],events:[...events],recognizers:instances.length};},
 async draft(){await queue.readBarrier();return readDraft(draftKey);},
};
