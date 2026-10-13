import {test,expect} from '@playwright/test';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
import fs from 'node:fs/promises';
import {createVoiceSegments,type VoiceSegment} from '../src/voice-segments';
test('interim stop stamps end once and matching final result does not repeat it',async({page})=>{
 const segments:VoiceSegment[]=[];
 const playback:string[]=[];
 const handler=createVoiceSegments(segment=>segments.push(segment),()=>{},command=>playback.push(command));
 handler.hear('START now!',2,['Iron stroke']);
 handler.hear('please STOP.',4,['Iron stroke']);
 expect(segments).toEqual([]);
 handler.hear('please Iron stroke.',4,['Iron stroke']);
 expect(segments).toEqual([{label:'Iron stroke',start_sec:2,end_sec:4}]);
 expect(playback).toEqual(['play','pause']);
 // Feed Chrome-style interim and final results through the same method as the mic.
 let stamps=0;const interimSegments:VoiceSegment[]=[];const interimPlayback:string[]=[];
 const interim=createVoiceSegments(segment=>interimSegments.push(segment),state=>{if(state.end_sec!==null)stamps++;},command=>interimPlayback.push(command));
 interim.result(0,'START now',2,false,['Iron stroke']);
 interim.result(0,'START now.',3,true,['Iron stroke']);
 interim.result(1,'please stop',4,false,['Iron stroke']);
 interim.result(1,'please stop.',4.75,true,['Iron stroke']);
 interim.result(1,'please stop.',4.9,true,['Iron stroke']);
 expect(stamps).toBe(1);expect(interimPlayback).toEqual(['play','pause']);
 interim.result(2,'Iron stroke',4.75,false,['Iron stroke']);expect(interimSegments).toEqual([]);
 interim.result(2,'Iron stroke.',4.75,true,['Iron stroke']);
 expect(interimSegments).toEqual([{label:'Iron stroke',start_sec:2,end_sec:4}]);
 console.log('INTERIM stop @ 4 sec: end_sec = 4\nFINAL same phrase @ 4.75 sec: end_sec = 4\nEND TIME STAMPS: '+stamps+'\nPLAY CALLS: 1\nPAUSE CALLS: 1\nINTERIM LABEL: not saved\nFINAL LABEL: saved once');
 // Whole phrases, longest label, duplicate results and invalid end times.
 const checks:VoiceSegment[]=[];const second=createVoiceSegments(segment=>checks.push(segment));
 second.hear('restart',1,['stroke','Iron stroke']);second.hear('stop',5,['stroke','Iron stroke']);second.hear('Iron stroke',5,['stroke','Iron stroke']);
 expect(checks).toEqual([]);
 second.hear('start now',2,['stroke','Iron stroke']);second.hear('stop',1,['stroke','Iron stroke']);second.hear('Iron stroke',5,['stroke','Iron stroke']);
 expect(checks).toEqual([]);
 second.hear('stop please',5,['stroke','Iron stroke']);second.hear('Iron stroke.',5,['stroke','Iron stroke']);second.hear('Iron stroke.',5,['stroke','Iron stroke']);
 expect(checks).toEqual([{label:'Iron stroke',start_sec:2,end_sec:5}]);

 await page.addInitScript(()=>{
  class Speech{continuous=false;interimResults=false;lang='';onstart:any;onend:any;onresult:any;onerror:any;start(){let i=0;const results:any[]=[];(window as any).feedWords=(text:string,final=true)=>{results[i]={isFinal:final,0:{transcript:text}};this.onresult({resultIndex:i,results});if(final)i++;};this.onstart();}stop(){this.onend?.();}abort(){}}
  (window as any).SpeechRecognition=Speech;
 });
 await page.goto('/');await page.getByRole('button',{name:'Try a sample video',exact:true}).click();
 await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 const feed=async(text:string,time:number,final=true)=>{await page.locator('video').evaluate((v:HTMLVideoElement,t)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>t}),time);await page.evaluate(({text,final})=>(window as any).feedWords(text,final),{text,final});};
 await feed('start',2,false);await expect(page.locator('.trial-guide-line strong')).toHaveText('Say stop');
 await feed('start',3,true);await feed('stop',4,false);await expect(page.locator('.trial-guide-line strong')).toHaveText('Say a label');
 await feed('stop',4.75,true);await feed('iron hold',4.75,false);await expect(page.locator('tbody tr')).toHaveCount(0);
 await feed('iron hold',4.75,true);await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('.trial-guide-line strong')).toHaveText('Saved. Do the next one');
 await page.getByRole('button',{name:'Turn mic off',exact:true}).click();await expect(page.locator('.trial-guide-line strong')).toHaveText('Turn on your mic');
 await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);
 const token=await page.evaluate(()=>localStorage.getItem('np-workspace-token')!);const backend=process.env.ANNOTATION_BACKEND_URL??'https://precious-fish-294.convex.cloud';const result=await new ConvexHttpClient(backend).query(api.annotations.exportAll,{workspaceToken:token});
 expect(result).toContainEqual({episode:'IRON_001_trial_45s.mp4',label:'iron_hold',start_sec:2,end_sec:4});
 await page.addInitScript(()=>{delete(window as any).SpeechRecognition;delete(window as any).webkitSpeechRecognition;});await page.reload();await expect(page.getByText('Open in Chrome to use the mic, or open More tools to label by hand.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeDisabled();
});
