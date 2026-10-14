export type CommandTime={videoTime:number;audioFrame:number};
export function playbackCommand(text:string){
 const value=text.trim().replace(/[.!?,]+$/,'').trim().toLowerCase();
 if(/^(?:start|play|resume)(?: (?:the )?(?:video|playback))?$/.test(value))return 'start';
 if(/^(?:stop|pause)(?: (?:the )?(?:video|playback))?$/.test(value))return 'stop';
 return null;
}
export async function playMarkedVideo(video:Pick<HTMLVideoElement,'currentTime'|'play'>,start:number){
 video.currentTime=start;
 try{await video.play();}catch(error){
  throw Error(error instanceof DOMException&&error.name==='NotAllowedError'?'Your browser blocked playback. Press the Play button once, then use voice commands.':'The video could not start. Press the Play button to retry. Your feedback is kept.');
 }
}
export class FeedbackCommands {
 phase:'ready'|'marking'|'feedback'='ready';
 private seen=new Set<number>();
 private candidates=new Map<number,{word:string;time:CommandTime}>();
 constructor(private handlers:{start:(time:CommandTime)=>void;stop:(time:CommandTime)=>void;feedback:(text:string)=>void}){}
 resetResults(){this.seen.clear();this.candidates.clear();}
 result(index:number,text:string,final:boolean,time:CommandTime){
  if(this.seen.has(index))return;
  const phrase=text.trim(),standalone=playbackCommand(phrase),joinedStop=!standalone&&this.phase==='marking'?/^(?:stop|pause)(?: (?:the )?(?:video|playback))?\b[.!?,;:\s]+(.+)$/i.exec(phrase):null;
  const word=standalone??(joinedStop?'stop':null);
  if(word){if(this.candidates.get(index)?.word!==word)this.candidates.set(index,{word,time:{...time}});}else this.candidates.delete(index);
  // An interim 'start' may still become 'start with the logo'. Only final standalone commands act.
  if(!final)return;this.seen.add(index);
  const captured=this.candidates.get(index)?.time??time;this.candidates.delete(index);
  if(word==='start'){this.phase='marking';this.handlers.start(captured);}
  else if(word==='stop'){if(this.phase==='marking'){this.phase='feedback';this.handlers.stop(captured);if(this.phase==='feedback'&&joinedStop?.[1])this.handlers.feedback(joinedStop[1].trim());}}
  else if(this.phase==='feedback'&&phrase)this.handlers.feedback(phrase);
 }
}
