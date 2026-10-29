// Real voice components and marketing queue; only browser speech and account/network boundaries are controlled.
import {useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {getFunctionName} from 'convex/server';
import {VoiceLabels} from '../../src/VoiceLabels';
import {FeedbackComposer} from '../../src/marketing/FeedbackComposer';
import {FeedbackQueue} from '../../src/marketing/feedback-queue';
import {writeDrafts} from '../../src/marketing/drafts';
import type {Recognition} from '../../src/marketing/voice-session';
import '../../src/style.css';
import '../../src/marketing/marketing-dark.css';
import '../../src/marketing/marketing.css';
import '../../src/marketing/feedback-tool.css';
import '../../src/voice-feedback-ui.css';

type Saving='automatic'|'held'|'fail';
const annotations:any[]=[],feedback:any[]=[],attempts:any[]=[],events:string[]=[],instances:Speech[]=[];
let saving:Saving='automatic';
let pending:{resolve:()=>void;reject:(error:Error)=>void}[]=[];
async function persist(value:any,target:any[]){
 attempts.push({...value});
 if(saving==='fail')throw Error('Isolated save failure');
 if(saving==='held')await new Promise<void>((resolve,reject)=>pending.push({resolve,reject}));
 target.push({...value});return `isolated-${target.length}`;
}
export const useAnnotationWorkspace=()=>({workspaceToken:'isolated-voice-ui',kind:'trial'});
export const useAnnotationQuery=()=>[];
const saveLabels=async()=>null;
const saveAnnotation=(value:any)=>persist(value,annotations);
export function useAnnotationMutation(ref:any){const name=getFunctionName(ref);if(name==='annotations:save')return saveAnnotation;if(name==='labels:save')return saveLabels;throw Error('Unexpected mutation: '+name);}
export const useQuery=()=>({email:'voice-ui@example.invalid'});
export const useSample=()=>null;
const queue=new FeedbackQueue('isolated-voice-ui-queue',{read:async()=>[],write:writeDrafts});
queue.bind({upload:async()=>{throw Error('This text-only fixture must not upload audio.');},save:value=>persist(value,feedback)});
export function useFeedbackQueue(){useSyncExternalStore(queue.subscribe,queue.snapshot);return queue;}

class Speech implements Recognition{
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 constructor(){instances.push(this);}
 start(){events.push('start');}stop(){events.push('stop');this.onend?.();}abort(){events.push('abort');}
}
(window as any).SpeechRecognition=Speech;
const player=Object.assign(new EventTarget(),{currentTime:0,duration:30,paused:true,playsInline:false,play:async()=>{player.paused=false;events.push('play');player.dispatchEvent(new Event('play'));},pause:()=>{player.paused=true;events.push('pause');player.dispatchEvent(new Event('pause'));}});
const video={current:player as unknown as HTMLVideoElement};
let labels=['Turn left','Turn right','Lift cup','Pour water','Close lid','Fold shirt','Open box','Move sleeve','Put down'];
let active=true;
const marketing=location.hash.startsWith('#marketing'),compact=!location.hash.endsWith('full');
const root=createRoot(document.getElementById('root')!);
function render(){root.render(<>
 <div className={marketing?'marketing-app marketing-dark':''}>
 {marketing?<FeedbackComposer cardId="voice-ui-card" version={{id:'voice-ui-version',number:1,name:'Isolated video',size:1,duration:30,width:100,height:100,uploadedAt:0,uploader:'Fixture',deleted:false}} video={video} onRecording={()=>{}} compact={compact}/>:<VoiceLabels videoOnly episodeId={'voice-ui-episode' as any} labels={labels} video={video} compact={compact} active={active}/>}
 </div>
 <label>Outside text<input aria-label="Outside text"/></label><label>Outside notes<textarea aria-label="Outside notes"/></label>
 <label>Outside choice<select aria-label="Outside choice"><option>First</option><option>Second</option></select></label>
 <div contentEditable aria-label="Editable text" role="textbox"/><div role="textbox" tabIndex={0} aria-label="Custom text field"/>
 <form aria-label="Outside form"><button type="button">Form control</button></form>
 <dialog aria-label="Edit annotation" className="segment-editor"><input aria-label="Editor label"/><button type="button">Editor control</button><p tabIndex={0}>Editor content</p></dialog>
 <div id="neutral" tabIndex={0}>Keyboard testing surface</div>
 </>);}
void queue.init().then(render);
(window as any).voiceUiTest={
 connect(){instances.at(-1)?.onstart?.();},
 result(text:string,final:boolean,index:number,time?:number){if(time!==undefined)player.currentTime=time;const results:any[]=Array.from({length:index+1},()=>({isFinal:true,0:{transcript:''}}));results[index]={isFinal:final,0:{transcript:text}};instances.at(-1)?.onresult?.({resultIndex:index,results});},
 time(value:number){player.currentTime=value;},
 end(){instances.at(-1)?.onend?.();},
 error(error:string){instances.at(-1)?.onerror?.({error});},
 saveMode(mode:Saving){saving=mode;},
 resolve(){const held=pending;pending=[];for(const item of held)item.resolve();},
 reject(){const held=pending;pending=[];for(const item of held)item.reject(Error('Isolated held save failure'));},
 labels(value:string[]){labels=value;render();},
 active(value:boolean){active=value;render();},
 unmount(){root.unmount();},
 dialog(){document.querySelector<HTMLDialogElement>('dialog.segment-editor')!.showModal();},
 snapshot(){return {annotations:[...annotations],feedback:[...feedback],attempts:[...attempts],events:[...events],jobs:queue.jobs.map(job=>({...job})),recognizers:instances.length,paused:player.paused,time:player.currentTime};},
};
