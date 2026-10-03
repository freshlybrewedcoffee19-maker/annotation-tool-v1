export type VoiceSegment={label:string;start_sec:number;end_sec:number};
export type VoiceState={waiting:'start'|'stop'|'label';start_sec:number|null;end_sec:number|null;error:string|null};
export function normalizeSpeech(text:string){return text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').trim().replace(/\s+/g,' ');}
function containsPhrase(words:string,phrase:string){const normalized=normalizeSpeech(phrase);return !!normalized&&` ${words} `.includes(` ${normalized} `);}
// The mic and tests share both the command handler and result deduplication.
export function createVoiceSegments(onSegment:(segment:VoiceSegment)=>void,onState:(state:VoiceState)=>void=()=>{},onPlayback:(command:'play'|'pause')=>void=()=>{}){
 let state:VoiceState={waiting:'start',start_sec:null,end_sec:null,error:null};
 let finalThrough=-1;
 const phrases=new Map<number,Set<'start'|'stop'>>();
 function update(next:VoiceState){state=next;onState({...state});}
 function hear(words:string,time:number,labels:readonly string[],isFinal=true,handled=new Set<'start'|'stop'>()){
  if(!Number.isFinite(time)||time<0)return;
  const normalized=normalizeSpeech(words);
  if(isFinal&&state.waiting==='label'){
   const label=[...labels].sort((a,b)=>normalizeSpeech(b).length-normalizeSpeech(a).length).find(label=>containsPhrase(normalized,label));
   if(label){const segment={label,start_sec:state.start_sec!,end_sec:state.end_sec!};update({waiting:'start',start_sec:null,end_sec:null,error:null});onSegment(segment);return;}
  }
  if(!handled.has('start')&&containsPhrase(normalized,'start')){handled.add('start');update({waiting:'stop',start_sec:time,end_sec:null,error:null});onPlayback('play');return;}
  if(!handled.has('stop')&&state.waiting==='stop'&&containsPhrase(normalized,'stop')){
   handled.add('stop');
   onPlayback('pause');
   if(time<=state.start_sec!){update({...state,error:'End must be after start. Move the video forward, then say stop again.'});return;}
   update({...state,waiting:'label',end_sec:time,error:null});
  }
 }
 return {hear,beginSession(){finalThrough=-1;phrases.clear();},result(index:number,words:string,time:number,isFinal:boolean,labels:readonly string[]){
  if(index<=finalThrough)return;
  const handled=phrases.get(index)??new Set<'start'|'stop'>();phrases.set(index,handled);
  hear(words,time,labels,isFinal,handled);
  if(isFinal){finalThrough=index;phrases.delete(index);}
 }};
}
