// Real CardView, AnnotationVideo, playback controls, DOM refs and event listeners.
// The test bundler exposes CardView only in its in-memory bundle.
import {createRoot} from 'react-dom/client';
// @ts-expect-error CardView is intentionally private in the production module.
import {IsolatedCardView} from '../../src/marketing/MarketingApp';
import {configureProductTracking} from '../../src/product-tracking';
import type {CardData} from '../../src/marketing/types';

const tracked:unknown[]=[];
configureProductTracking(async event=>{tracked.push({...event});});

type MediaState={id:number;time:number;paused:boolean;plays:number};
const media=new WeakMap<HTMLMediaElement,MediaState>();
let sequence=0,blocked=false,previous:HTMLVideoElement|null=null;
function state(element:HTMLMediaElement){
 let value=media.get(element);
 if(!value){value={id:++sequence,time:0,paused:true,plays:0};media.set(element,value);}
 return value;
}
Object.defineProperties(HTMLMediaElement.prototype,{
 currentTime:{configurable:true,get(){return state(this).time;},set(value:number){state(this).time=value;}},
 duration:{configurable:true,get(){return 30;}},
 paused:{configurable:true,get(){return state(this).paused;}},
 play:{configurable:true,value:function(this:HTMLMediaElement){
  state(this).plays++;
  if(blocked)return Promise.reject(new DOMException('Isolated playback blocked','NotAllowedError'));
  state(this).paused=false;
  this.dispatchEvent(new Event('play'));
  // A fulfilled play request is deliberately separate from the actual playing event.
  return Promise.resolve();
 }},
 pause:{configurable:true,value:function(this:HTMLMediaElement){state(this).paused=true;this.dispatchEvent(new Event('pause'));}},
});

const version=(id:string,number:number)=>({id,number,name:`Cut ${number}`,size:1024,duration:30,width:1280,height:720,uploadedAt:0,uploader:'Fixture',deleted:false});
const feedback=(id:string,versionId:string,start:number,text:string)=>({id,versionId,start,end:start+2,text,audioId:null,author:'Fixture',createdAt:0,reviewed:false});
const data:CardData={
 card:{id:'clip-card',title:'Isolated clip review',status:'needs_feedback',latestVersionId:'version-2',approvedVersionId:null,finalised:false,cleaning:false},
 owner:false,versions:[version('version-1',1),version('version-2',2)],
 feedback:[feedback('feedback-2','version-2',1,'Shorten the intro'),feedback('feedback-1','version-1',5,'Move the title')],
 replies:[],events:[],access:[],links:[],
};

// These replace only the account and network hooks, never CardView or its media components.
export const useSample=()=>null;
export const useQuery=()=>undefined;
const unexpected=async()=>{throw Error('Unexpected isolated account request');};
export const useMutation=()=>unexpected;
export const useAction=()=>unexpected;
export const createSample=()=>{throw Error('Unexpected sample request');};
export const SampleProvider=({children}:{children:unknown})=>children;

const current=()=>document.querySelector('video')!;
(window as any).clipTest={
 blocked(value:boolean){blocked=value;},
 ready(){for(const name of ['loadedmetadata','loadeddata','durationchange'])current().dispatchEvent(new Event(name));},
 playing(count=1){for(let index=0;index<count;index++)current().dispatchEvent(new Event('playing'));},
 remember(){previous=current();},
 oldPlaying(){previous?.dispatchEvent(new Event('playing'));},
 snapshot(){const player=current();return {tracked:[...tracked],media:player?{...state(player),source:player.src}:null};},
};
createRoot(document.getElementById('root')!).render(<IsolatedCardView data={data} token="isolated-review-token" publicView/>);
