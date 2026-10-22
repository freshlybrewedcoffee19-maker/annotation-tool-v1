import type {ProductEventInput} from './product-tracking';

type ClipSelection={versionId:string;start:number;end:number;event:ProductEventInput};
/** Observes playback only; it never starts, pauses, seeks or changes the video. */
export function createClipPlayTracker(send:(event:ProductEventInput)=>void){
 let sequence=0,pending:(ClipSelection&{request:number})|null=null;
 return {
  arm(selection:ClipSelection){pending={...selection,request:++sequence};return sequence;},
  cancel(request?:number){if(request===undefined||pending?.request===request)pending=null;},
  playing(versionId:string,time:number){
   if(!pending||pending.versionId!==versionId||!Number.isFinite(time)||time<pending.start-.1||time>=pending.end)return;
   const event=pending.event;pending=null;
   try{send(event);}catch{/* Measurement must never interrupt playback. */}
  },
 };
}
