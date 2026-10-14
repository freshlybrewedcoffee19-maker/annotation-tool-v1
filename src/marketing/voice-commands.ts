export type CommandTime={videoTime:number;audioFrame:number};
type PlaybackCommand='start'|'stop';
export function playbackCommand(text:string){
 const value=text.trim().replace(/[.!?,;:]+$/,'').trim().toLowerCase().replace(/\s+/g,' ');
 if(/^(?:start|play|resume)(?: (?:the )?(?:video|playback))?(?:[.!?,;:\s]+(?:start|play|resume)(?: (?:the )?(?:video|playback))?)*$/.test(value))return 'start';
 if(/^(?:stop|pause)(?: (?:the )?(?:video|playback))?(?:[.!?,;:\s]+(?:stop|pause)(?: (?:the )?(?:video|playback))?)*$/.test(value))return 'stop';
 return null;
}
const stoppedFeedback=(phrase:string)=>/^(?:stop|pause)(?: (?:the )?(?:video|playback))?\b[.!?,;:\s]+(.+)$/i.exec(phrase);
export async function playMarkedVideo(video:Pick<HTMLVideoElement,'currentTime'|'play'>,start:number){
 video.currentTime=start;
 try{await video.play();}catch(error){
  throw Error(error instanceof DOMException&&error.name==='NotAllowedError'?'Your browser blocked playback. Press the Play button once, then use voice commands.':'The video could not start. Press the Play button to retry. Your feedback is kept.');
 }
}
export class FeedbackCommands {
 phase:'ready'|'marking'|'feedback'='ready';
 private seen=new Set<number>();
 private candidates=new Map<number,{word:PlaybackCommand;time:CommandTime;standalone:boolean}>();
 private acted=new Map<number,PlaybackCommand>();
 constructor(private handlers:{start:(time:CommandTime)=>void;stop:(time:CommandTime)=>void;feedback:(text:string)=>void}){}
 resetResults(){this.seen.clear();this.candidates.clear();this.acted.clear();}
 private act(word:PlaybackCommand,time:CommandTime){
  if(word==='start'){this.phase='marking';this.handlers.start(time);}
  else if(this.phase==='marking'){this.phase='feedback';this.handlers.stop(time);}
 }
 /** A real speech boundary can finish a command even when the service omits its final event. */
 endUtterance(){
  for(const [index,candidate] of this.candidates){
   if(!candidate.standalone)continue;
   this.candidates.delete(index);this.acted.set(index,candidate.word);
   this.act(candidate.word,candidate.time);
  }
 }
 result(index:number,text:string,final:boolean,time:CommandTime){
  if(this.seen.has(index))return;
  const phrase=text.trim(),standalone=playbackCommand(phrase),acted=this.acted.get(index);
  if(acted){
   if(!final)return;
   this.seen.add(index);this.acted.delete(index);
   // A late final result may attach the comment to a stop that already paused playback.
   const joinedStop=acted==='stop'&&!standalone&&this.phase==='feedback'?stoppedFeedback(phrase):null;
   if(joinedStop?.[1])this.handlers.feedback(joinedStop[1].trim());
   return;
  }
  const joinedStop=!standalone&&this.phase==='marking'?stoppedFeedback(phrase):null;
  const word=standalone??(joinedStop?'stop':null);
  if(word){const previous=this.candidates.get(index);this.candidates.set(index,{word,time:previous?.word===word?previous.time:{...time},standalone:!!standalone});}else this.candidates.delete(index);
  // The first start can play immediately. During feedback, wait so "start with the logo" stays a comment.
  if(!final){
   if(this.phase==='ready'&&standalone==='start'){this.candidates.delete(index);this.acted.set(index,'start');this.act('start',time);}
   return;
  }
  this.seen.add(index);
  const captured=this.candidates.get(index)?.time??time;this.candidates.delete(index);
  if(word){const wasMarking=this.phase==='marking';this.act(word,captured);if(word==='stop'&&wasMarking&&this.phase==='feedback'&&joinedStop?.[1])this.handlers.feedback(joinedStop[1].trim());}
  else if(this.phase==='feedback'&&phrase)this.handlers.feedback(phrase);
 }
}
