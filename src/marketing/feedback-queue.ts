import type {FeedbackDraft} from './drafts';
export type FeedbackJob=FeedbackDraft&{versionId:string;versionNumber:number;videoDuration:number;state:'queued'|'saving'|'failed'|'saved';error?:string};
export type QueueAPI={upload:(job:FeedbackJob,checkpoint:()=>Promise<void>)=>Promise<string|undefined>;save:(job:FeedbackJob)=>Promise<unknown>};
/** The queue owns immutable segment snapshots, independent of the composer and network timing. */
export class FeedbackQueue {
 jobs:FeedbackJob[]=[];ready=false;revision=0;
 private listeners=new Set<()=>void>();private running=new Set<string>();private api?:QueueAPI;private durable=new Set<string>();
 private writes:Promise<void>=Promise.resolve();private initialised=false;
 constructor(private key:string,private storage:{read:()=>Promise<FeedbackJob[]|undefined>;write:(entries:[string,unknown][])=>Promise<void>}){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};snapshot=()=>this.revision;
 private changed(){this.revision++;this.listeners.forEach(fn=>fn());}
 async init(){if(this.initialised)return;this.initialised=true;try{const recovered=await this.storage.read();for(const job of recovered??[]){if(!this.jobs.some(row=>row.clientKey===job.clientKey))this.jobs.push({...job,state:job.state==='failed'?'failed':'queued'});this.durable.add(job.clientKey);}}finally{this.ready=true;this.changed();this.pump();}}
 bind(api:QueueAPI){this.api=api;this.pump();}
 checkpoint(extra:[string,unknown][]=[]){const records=this.jobs.filter(job=>job.state!=='saved').map(job=>({...job}));const task=this.writes.catch(()=>{}).then(()=>this.storage.write([[this.key,records],...extra]));this.writes=task;return task;}
 draft(key:string,draft:FeedbackDraft){return this.checkpoint([[key,{...draft}]]);}
 async readBarrier(){await this.writes.catch(()=>{});}
 enqueue(job:FeedbackJob,replacement?:[string,FeedbackDraft]){
  if(this.jobs.some(row=>row.clientKey===job.clientKey))return;
  this.jobs.push({...job,state:'queued'});this.changed();
  void this.checkpoint(replacement?[replacement]:[]).then(()=>{this.durable.add(job.clientKey);this.pump();}).catch(error=>{job=this.jobs.find(row=>row.clientKey===job.clientKey)!;job.state='failed';job.error='Browser recovery could not save this comment. Keep this tab open and retry. '+String(error);this.changed();});
 }
 retry(key:string,text?:string){const job=this.jobs.find(row=>row.clientKey===key);if(!job||job.state!=='failed')return;if(text!==undefined)job.text=text;job.state='queued';job.error=undefined;this.changed();void this.checkpoint().then(()=>{this.durable.add(job.clientKey);this.pump();}).catch(error=>{job.state='failed';job.error=String(error);this.changed();});}
 private pump(){if(!this.api||!this.ready)return;for(const job of this.jobs){if(this.running.size>=2)break;if(job.state!=='queued'||!this.durable.has(job.clientKey)||this.running.has(job.clientKey))continue;this.running.add(job.clientKey);job.state='saving';this.changed();void this.process(job);}}
 private async process(job:FeedbackJob){try{if(!job.text.trim())throw Error('Add a transcript for this recording, then retry.');if(job.blob&&!job.audioId)job.audioId=await this.api!.upload(job,()=>this.checkpoint());await this.checkpoint();await this.api!.save(job);job.state='saved';job.blob=undefined;job.error=undefined;await this.checkpoint();}catch(error){job.state='failed';job.error=error instanceof Error?error.message:'Saving failed. Your comment and audio are kept.';void this.checkpoint().catch(()=>{});}finally{this.running.delete(job.clientKey);this.changed();this.pump();}}
}
