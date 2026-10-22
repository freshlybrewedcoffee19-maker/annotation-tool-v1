import {describe,expect,it} from 'vitest';
import corpus from '../evals/voice-cases.json';
import {FeedbackCommands,type CommandTime} from '../src/marketing/voice-commands';
import {createVoiceSegments,type VoiceSegment} from '../src/voice-segments';

type MarketingOutcome={starts:number[];stops:number[];feedback:string[];phase:string;startFrames?:number[];stopFrames?:number[]};
type AnnotationOutcome={segments:VoiceSegment[];playback:string[];waiting:string;start:number|null;end:number|null;error:string|null};
type Step<T>={kind:'result';index:number;text:string;final:boolean;time:number;audioFrame?:number;checkpoint?:T}|{kind:'restart'|'boundary';checkpoint?:T};
type Case={id:string;name:string;workflow:'marketing';steps:Step<MarketingOutcome>[];expected:MarketingOutcome}|{id:string;name:string;workflow:'annotation';labels?:string[];steps:Step<AnnotationOutcome>[];expected:AnnotationOutcome};

// The input corpus describes user-visible outcomes independently of engine internals.
// Callbacks here are observations only: no mock command parser or saving rule is used.
// Database persistence and browser microphone behavior are deliberately outside this layer.
const cases=corpus.cases as Case[];

describe('Cheddar Vox transcript-to-command/segment golden evaluations',()=>{
 for(const scenario of cases){
  it(`${scenario.id} [${scenario.workflow}] ${scenario.name}`,()=>{
   if(scenario.workflow==='marketing'){
    const starts:CommandTime[]=[],stops:CommandTime[]=[],feedback:string[]=[];
    const engine=new FeedbackCommands({start:time=>starts.push({...time}),stop:time=>stops.push({...time}),feedback:text=>feedback.push(text)});
    const check=(expected:MarketingOutcome)=>{
     expect({starts:starts.map(t=>t.videoTime),stops:stops.map(t=>t.videoTime),feedback:[...feedback],phase:engine.phase}).toEqual({starts:expected.starts,stops:expected.stops,feedback:expected.feedback,phase:expected.phase});
     if(expected.startFrames)expect(starts.map(t=>t.audioFrame)).toEqual(expected.startFrames);
     if(expected.stopFrames)expect(stops.map(t=>t.audioFrame)).toEqual(expected.stopFrames);
    };
    for(const step of scenario.steps){
     if(step.kind==='result')engine.result(step.index,step.text,step.final,{videoTime:step.time,audioFrame:step.audioFrame??0});
     else if(step.kind==='restart')engine.resetResults();
     else engine.endUtterance();
     if(step.checkpoint)check(step.checkpoint);
    }
    check(scenario.expected);
   }else{
    const segments:VoiceSegment[]=[],playback:string[]=[];
    const engine=createVoiceSegments(segment=>segments.push({...segment}),()=>{},command=>playback.push(command),true);
    const check=(expected:AnnotationOutcome)=>{
     const state=engine.getState();
     expect({segments:[...segments],playback:[...playback],waiting:state.waiting,start:state.start_sec,end:state.end_sec,error:state.error}).toEqual(expected);
    };
    for(const step of scenario.steps){
     if(step.kind==='result')engine.result(step.index,step.text,step.time,step.final,scenario.labels??[]);
     else if(step.kind==='restart')engine.beginSession();
     else throw Error(`Annotation case ${scenario.id} cannot use a marketing speech boundary.`);
     if(step.checkpoint)check(step.checkpoint);
    }
    check(scenario.expected);
   }
  });
 }
});
