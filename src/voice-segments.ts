export type VoiceSegment={label:string;start_sec:number;end_sec:number};
export type OpenVoiceSegment={label:string;start_sec:number};
export function normalizeSpeech(text:string){return text.toLocaleLowerCase().replace(/[.,!?;:]/g,'').trim().replace(/\s+/g,' ');}
// The mic and tests both pass final recognised words to this handler.
export function createVoiceSegments(onSegment:(segment:VoiceSegment)=>void,onOpen:(segment:OpenVoiceSegment|null)=>void=()=>{}){
 let open:OpenVoiceSegment|null=null;
 function finish(time:number){
  if(!open)return;
  const segment={...open,end_sec:time};open=null;onOpen(null);
  if(Number.isFinite(time)&&time>segment.start_sec)onSegment(segment);
 }
 return {finish,hear(words:string,time:number,playing:boolean,labels:readonly string[]){
  if(!Number.isFinite(time)||time<0)return;
  const command=normalizeSpeech(words);
  if(command==='stop'){finish(time);return;}
  const label=labels.find(label=>normalizeSpeech(label)===command);
  if(!playing||!label)return;
  if(open?.label===label)return;
  finish(time);open={label,start_sec:time};onOpen(open);
 }};
}
