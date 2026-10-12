import {describe,it,expect} from 'vitest';
import {createVoiceSegments,type VoiceSegment} from '../src/voice-segments';
describe('labels spoken without setup',()=>{
 it('accepts an unseen phrase only after final recognition and keeps marked times',()=>{
 const saved:VoiceSegment[]=[];const playback:string[]=[];
 const engine=createVoiceSegments(s=>saved.push(s),()=>{},c=>playback.push(c),true);
 engine.result(0,'start',2,false,[]);engine.result(0,'start',2.5,true,[]);
 engine.result(1,'stop',5,false,[]);engine.result(1,'stop',5.5,true,[]);
 engine.result(2,'folding shirt',6,false,[]);expect(saved).toEqual([]);
 engine.result(2,'Folding shirt.',6,true,[]);engine.result(2,'Folding shirt.',7,true,[]);
 expect(saved).toEqual([{label:'Folding shirt',start_sec:2,end_sec:5}]);expect(playback).toEqual(['play','pause']);
 });
 it('accepts labels containing command words',()=>{const saved:VoiceSegment[]=[];const engine=createVoiceSegments(s=>saved.push(s),()=>{},()=>{},true);engine.hear('start',1,[]);engine.hear('stop',3,[]);engine.hear('stop sign',3,[]);expect(saved[0].label).toBe('stop sign');});
 it('keeps the full new label rather than replacing it with a saved substring',()=>{
 const saved:VoiceSegment[]=[];const engine=createVoiceSegments(s=>saved.push(s),()=>{},()=>{},true);
 engine.hear('start',1,['walking']);engine.hear('stop',3,['walking']);engine.hear('walking quickly',3,['walking']);
 expect(saved[0].label).toBe('walking quickly');
 });
});
