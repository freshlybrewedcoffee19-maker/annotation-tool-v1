export type CommandTime={videoTime:number;audioFrame:number};
export class FeedbackCommands {
 phase:'ready'|'marking'|'feedback'='ready';
 private seen=new Set<number>();
 private candidates=new Map<number,{word:string;time:CommandTime}>();
 constructor(private handlers:{start:(time:CommandTime)=>void;stop:(time:CommandTime)=>void;feedback:(text:string)=>void}){}
 resetResults(){this.seen.clear();this.candidates.clear();}
 result(index:number,text:string,final:boolean,time:CommandTime){
  if(this.seen.has(index))return;
  const phrase=text.trim(),word=/^(start|stop)[.!?,]*$/i.exec(phrase)?.[1].toLowerCase();
  if(word){if(this.candidates.get(index)?.word!==word)this.candidates.set(index,{word,time:{...time}});}else this.candidates.delete(index);
  // An interim 'start' may still become 'start with the logo'. Only final standalone commands act.
  if(!final)return;this.seen.add(index);
  const captured=this.candidates.get(index)?.time??time;this.candidates.delete(index);
  if(word==='start'){this.phase='marking';this.handlers.start(captured);}
  else if(word==='stop'&&this.phase==='marking'){this.phase='feedback';this.handlers.stop(captured);}
  else if(this.phase==='feedback'&&phrase)this.handlers.feedback(phrase);
 }
}
