/** Save only settled speech; a new utterance or manual action keeps the draft open. */
export class FeedbackAutosave {
 private timer:ReturnType<typeof setTimeout>|undefined;
 constructor(private save:()=>void,private delay=1500){}
 activity(){this.cancel();}
 finalized(){this.cancel();this.timer=setTimeout(()=>{this.timer=undefined;this.save();},this.delay);}
 cancel(){clearTimeout(this.timer);this.timer=undefined;}
}
