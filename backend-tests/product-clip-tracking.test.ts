import {describe,expect,it} from 'vitest';
import {createClipPlayTracker} from '../src/product-clip-tracking';

const selection={versionId:'v1',start:2,end:4,event:{workflow:'marketing' as const,name:'clip_play' as const,sample:true}};
describe('clip playback measurements',()=>{
 it('counts actual playback once, not a click or buffering resumes',()=>{
  const events:unknown[]=[];const tracker=createClipPlayTracker(event=>events.push(event));
  tracker.arm(selection);expect(events).toHaveLength(0);
  tracker.playing('v1',2);tracker.playing('v1',2.5);
  expect(events).toEqual([selection.event]);
 });
 it('waits for the selected version and marked interval',()=>{
  const events:unknown[]=[];const tracker=createClipPlayTracker(event=>events.push(event));
  tracker.arm(selection);tracker.playing('v2',2);tracker.playing('v1',0);
  expect(events).toHaveLength(0);tracker.playing('v1',2.1);expect(events).toHaveLength(1);
 });
 it('does not count a rejected or cancelled play request',()=>{
  const events:unknown[]=[];const tracker=createClipPlayTracker(event=>events.push(event));
  const request=tracker.arm(selection);tracker.cancel(request);tracker.playing('v1',2);
  expect(events).toHaveLength(0);
 });
 it('a late failure from an older request cannot cancel the new selection',()=>{
  const events:unknown[]=[];const tracker=createClipPlayTracker(event=>events.push(event));
  const old=tracker.arm(selection);tracker.arm({...selection,versionId:'v2'});tracker.cancel(old);
  tracker.playing('v2',2);expect(events).toHaveLength(1);
 });
 it('tracking failure never escapes into the media event handler',()=>{
  const tracker=createClipPlayTracker(()=>{throw Error('tracking offline');});
  tracker.arm(selection);expect(()=>tracker.playing('v1',2)).not.toThrow();
 });
});
