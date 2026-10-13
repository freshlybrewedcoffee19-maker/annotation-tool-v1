import {test,expect} from 'vitest';
import {FeedbackQueue,type FeedbackJob} from '../src/marketing/feedback-queue';
function job(key:string,start:number):FeedbackJob{return {clientKey:key,start:String(start),end:String(start+1),text:'Comment '+key,blob:new Blob([key],{type:'audio/wav'}),versionId:'version-'+key,versionNumber:start,videoDuration:20,state:'queued'};}
test('slow and failed saves never overwrite the next segment and retry uses the same audio and save key',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),saved:FeedbackJob[]=[],uploaded:string[]=[];let fail=true;
 const queue=new FeedbackQueue('queue',{read:async()=>[],write:async()=>{}});await queue.init();queue.bind({upload:async value=>{uploaded.push(value.clientKey);return 'audio-'+value.clientKey;},save:async value=>{if(value.clientKey==='first')await gate;if(value.clientKey==='second'&&fail){fail=false;throw Error('offline');}saved.push({...value});}});
 queue.enqueue(job('first',1));queue.enqueue(job('second',3));queue.enqueue(job('third',5));
 await expect.poll(()=>queue.jobs.find(row=>row.clientKey==='second')?.state).toBe('failed');
 expect(queue.jobs.find(row=>row.clientKey==='first')?.state).toBe('saving');
 await expect.poll(()=>saved.some(row=>row.clientKey==='third')).toBe(true);
 queue.retry('second');release();await expect.poll(()=>queue.jobs.every(row=>row.state==='saved')).toBe(true);
 expect(uploaded.sort()).toEqual(['first','second','third']);
 expect(saved.find(row=>row.clientKey==='second')).toMatchObject({audioId:'audio-second',start:'3',end:'4',versionId:'version-second',text:'Comment second'});
});
