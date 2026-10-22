// The marketing flow uses its real sample store, hooks and save queue. No server is used.
import {useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {ConvexProvider,ConvexReactClient} from 'convex/react';
import {getFunctionName} from 'convex/server';
import {api} from '../../convex/_generated/api';
import {FeedbackComposer} from '../../src/marketing/FeedbackComposer';
import {createSample,SampleProvider,useMutation,useQuery} from '../../src/marketing/hooks';
import {useFeedbackQueue} from '../../src/marketing/use-feedback-queue';
import type {FeedbackQueue} from '../../src/marketing/feedback-queue';
import type {Recognition} from '../../src/marketing/voice-session';
import {configureProductTracking} from '../../src/product-tracking';
import {VoiceLabels} from '../../src/VoiceLabels';
import {useImageLabelSaves,useImageVoice} from '../../src/useImageLabels';

type SinkMode='success'|'reject'|'throw'|'pending';
let sinkMode:SinkMode='success';
const tracked:unknown[]=[],speechEvents:string[]=[],instances:Speech[]=[],annotations:any[]=[],imageLabels:any[]=[];
configureProductTracking(event=>{
 tracked.push({...event});
 if(sinkMode==='throw')throw Error('Isolated tracking outage');
 if(sinkMode==='reject')return Promise.reject(Error('Isolated tracking outage'));
 if(sinkMode==='pending')return new Promise(()=>{});
 return Promise.resolve(null);
});

class Speech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 constructor(){instances.push(this);}
 start(){speechEvents.push('start');}
 stop(){speechEvents.push('stop');this.onend?.();}
 abort(){speechEvents.push('abort');}
}
(window as any).SpeechRecognition=Speech;
const player=Object.assign(new EventTarget(),{currentTime:0,duration:30,paused:true,playsInline:false,play:async()=>{player.paused=false;},pause:()=>{player.paused=true;}});
const video={current:player as unknown as HTMLVideoElement};
const sample=createSample();
let queue:FeedbackQueue;
const client=new ConvexReactClient('https://voice-fixture.convex.cloud',{unsavedChangesWarning:false});
function MarketingFixture(){
 const account=useQuery(api.accounts.me,{});
 queue=useFeedbackQueue(sample.data.card.id,account?.email??null);
 const edit=useMutation(api.marketing.saveFeedback);
 useSyncExternalStore(sample.subscribe,sample.snapshot);
 return <>
  <FeedbackComposer cardId={sample.data.card.id} version={sample.data.versions[0]} video={video} onRecording={()=>{}} compact/>
  <button disabled={!sample.data.feedback.length} onClick={()=>{const row=sample.data.feedback[0];void edit({cardId:sample.data.card.id,versionId:row.versionId,feedbackId:row.id,start:row.start,end:row.end,text:'Edited saved feedback'});}}>Edit saved feedback</button>
 </>;
}

function ImageFixture(){
 const saves=useImageLabelSaves('isolated-workspace');
 const voice=useImageVoice(true,label=>saves.add('isolated-image' as any,'isolated-image.png',label),{workspaceToken:'isolated-workspace',episodeId:'isolated-image' as any});
 return <>
  <button disabled={!voice.available} onClick={voice.toggle}>{voice.listening?'Turn mic off':'Turn mic on'}</button>
  {saves.items.map(item=><p key={item.key} role={item.state==='failed'?'alert':'status'}>{item.state}: {item.label}</p>)}
 </>;
}

// Only annotation and image hooks' account/network boundary is substituted by the test bundler.
// Its component, recognition callbacks, command engine and persistence call run unchanged.
export const useAnnotationWorkspace=()=>({workspaceToken:'isolated-workspace',kind:'trial'});
export const useAnnotationQuery=()=>[];
const saveAnnotation=async(args:any)=>{const id=`annotation-${annotations.length+1}`;annotations.push({...args,id});return id;};
const saveImage=async(args:any)=>{const id=`image-label-${imageLabels.length+1}`;imageLabels.push({...args,id});return id;};
const saveLabels=async()=>null;
export function useAnnotationMutation(ref:any){
 const name=getFunctionName(ref);
 if(name==='annotations:save')return saveAnnotation;
 if(name==='labels:save')return saveLabels;
 if(name==='images:save')return saveImage;
 throw Error(`Unexpected annotation mutation: ${name}`);
}
const root=createRoot(document.getElementById('root')!);
root.render(location.hash==='#annotation'
 ?<VoiceLabels episodeId={'isolated-episode' as any} labels={['Turn left']} video={video} compact/>
 :location.hash==='#image'?<ImageFixture/>
 :<ConvexProvider client={client}><SampleProvider store={sample}><MarketingFixture/></SampleProvider></ConvexProvider>);
(window as any).voiceTest={
 setSink(mode:SinkMode){sinkMode=mode;},
 connect(){instances.at(-1)?.onstart?.();},
 result(text:string,final:boolean,index:number,time?:number){if(time!==undefined)player.currentTime=time;const results:any[]=Array.from({length:index+1},()=>({isFinal:true,0:{transcript:''}}));results[index]={isFinal:final,0:{transcript:text}};instances.at(-1)?.onresult?.({resultIndex:index,results});},
 end(){instances.at(-1)?.onend?.();},
 stop(){window.dispatchEvent(new Event('marketing-stop-recording'));},
 snapshot(){return {feedback:sample.data.feedback.map(row=>({...row})),jobs:queue?.jobs.map(job=>({...job})),tracked:[...tracked],annotations:[...annotations],imageLabels:[...imageLabels],imageRecovery:JSON.parse(localStorage.getItem('cv-image-saves-isolated-workspace')??'[]'),speechEvents:[...speechEvents],recognizers:instances.length,paused:player.paused};},
};
