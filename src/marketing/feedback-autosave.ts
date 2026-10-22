const thinkingSound=/^(?:u+h*m+|u+h+|a+h+|e+r+m*|h+m+|m{2,})$/i;
const words=(text:string)=>text.match(/[\p{L}\p{N}]+/gu)??[];
/** Keep the original transcript; sounds alone are a draft, not a useful saved note. */
export function hasFeedbackWords(text:string){return words(text).some(word=>!thinkingSound.test(word));}
/** Android speakers get six quiet seconds, or twelve after a thinking sound. */
export function androidFeedbackPause(text:string){const last=words(text).at(-1);return last&&thinkingSound.test(last)?12000:6000;}

/** Save only settled speech; a new utterance or manual action keeps the draft open. */
export class FeedbackAutosave {
 private timer:ReturnType<typeof setTimeout>|undefined;
 private deadline:number|undefined;
 constructor(private save:()=>void,private delay=1500){}
 activity(){this.cancel();}
 finalized(delay=this.delay){this.cancel();this.deadline=Date.now()+delay;this.timer=setTimeout(()=>{this.timer=undefined;this.deadline=undefined;this.save();},delay);}
 // A browser reconnect is not fresh speech. Keep the original quiet deadline.
 pause(){clearTimeout(this.timer);this.timer=undefined;}
 resume(delay=this.delay){const remaining=this.deadline===undefined?delay:Math.max(0,this.deadline-Date.now());this.finalized(remaining);}
 cancel(){this.pause();this.deadline=undefined;}
}
