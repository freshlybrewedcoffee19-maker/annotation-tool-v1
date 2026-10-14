import {test,expect} from 'vitest';
import {createSample} from '../src/marketing/hooks';

test('sample feedback edits keep the original recording and update only the chosen clip',async()=>{
 const sample=createSample(),versionId=sample.data.versions[0].id;
 const first={versionId,start:.5,end:2,text:'Original comment',audioId:'original-recording',clientKey:'first'};
 const id=await sample.call('marketing:saveFeedback',first);
 const secondId=await sample.call('marketing:saveFeedback',{...first,start:3,end:4,text:'Other clip',audioId:'other-recording',clientKey:'second'});
 const untouched={...sample.data.feedback.find(row=>row.id===secondId)!};
 const original={...sample.data.feedback.find(row=>row.id===id)!};
 sample.audio.set('original-recording','blob:original-voice');

 expect(await sample.call('marketing:saveFeedback',{...first,feedbackId:id,start:1.125,end:2.875,text:'Corrected comment',audioId:'replacement-is-ignored'})).toBe(id);
 expect(sample.data.feedback.find(row=>row.id===id)).toEqual({...original,start:1.125,end:2.875,text:'Corrected comment'});
 expect(sample.audio.get('original-recording')).toBe('blob:original-voice');
 expect(sample.data.feedback.find(row=>row.id===secondId)).toEqual(untouched);
 expect(await sample.call('marketing:saveFeedback',first)).toBe(id);
 expect(sample.data.feedback).toHaveLength(2);
 expect(sample.data.feedback.find(row=>row.id===id)?.text).toBe('Corrected comment');
});

test('sample feedback rejects invalid timing without changing the saved comment or audio',async()=>{
 const sample=createSample(),version=sample.data.versions[0];
 const original={versionId:version.id,start:1,end:3,text:'Keep the original',audioId:'original-recording',clientKey:'first'};
 const feedbackId=await sample.call('marketing:saveFeedback',original);
 const saved={...sample.data.feedback[0]};
 for(const [start,end] of [[-1,2],[2,2],[3,2],[0,version.duration+.1],[NaN,2],[1,Infinity]]){
  await expect(sample.call('marketing:saveFeedback',{...original,feedbackId,start,end,text:'Invalid correction'})).rejects.toThrow('valid start and stop');
  expect(sample.data.feedback).toEqual([saved]);
 }
});
