import {test,expect} from '@playwright/test';
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
  class FakeSpeech {
   continuous=false;interimResults=false;lang='';onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror=null;onresult:((event:unknown)=>void)|null=null;
   start(){const results:any[]=[];let index=0;(window as any).feedWords=(words:string,isFinal=true)=>{results[index]={isFinal,0:{transcript:words}};this.onresult?.({resultIndex:index,results});if(isFinal)index++;};this.onstart?.();}
   stop(){this.onend?.();}abort(){}
  }
  (window as any).SpeechRecognition=FakeSpeech;
 });
 await page.goto('/');
 await expect(page.getByLabel('Label list',{exact:true})).toBeEnabled();
 const savedLabels=(await page.getByLabel('Label list',{exact:true}).inputValue()).split('\n').filter(Boolean);
 const savedLabel=savedLabels.find(label=>label.toLowerCase()==='iron stroke')??savedLabels[0];
 expect(savedLabel).toBeTruthy();
  await page.getByLabel('Upload video',{exact:true}).setInputFiles({name:'voice-interim-demo.mp4',mimeType:'video/mp4',buffer:await fs.readFile('tests/fixtures/short.mp4')});
  await expect(page.getByRole('button',{name:'Add segment',exact:true})).toBeEnabled();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('video').evaluate(async(v:HTMLVideoElement)=>{v.pause();v.currentTime=2;Object.defineProperty(v,'currentTime',{configurable:true,get:()=>2});});
  await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
  await expect(page.getByRole('button',{name:'Turn mic off',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByText('Listening. Say start, then stop, then a label.',{exact:true})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Waiting for: start');
  await expect(page.getByText('Listening',{exact:true})).toBeVisible();
  await expect(page.locator('.listening-dot')).toBeVisible();
  await page.evaluate(()=>(window as any).feedWords('START now!',false));
  await expect(page.getByRole('status')).toContainText('Waiting for: stop');
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
  const played=await page.locator('video').evaluate((v:HTMLVideoElement)=>!v.paused);
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime')!.get!.call(v))).toBeGreaterThanOrEqual(4);
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>4}));
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>3}));
  await page.evaluate(()=>(window as any).feedWords('START now!',true));
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>4}));
  await page.evaluate(()=>(window as any).feedWords('please STOP.',false));
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
  const paused=await page.locator('video').evaluate((v:HTMLVideoElement)=>v.paused);
  await expect(page.getByRole('status')).toContainText('Waiting for: a label');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>4.75}));
  await page.evaluate(()=>(window as any).feedWords('please STOP.',true));
  await expect(page.getByText('Start: 2.000 sec / End: 4.000 sec',{exact:true})).toBeVisible();
  await page.evaluate(label=>(window as any).feedWords(label,false),savedLabel);
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.evaluate(label=>(window as any).feedWords(`please ${label.toUpperCase()}.`),savedLabel);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Waiting for: start');
  await expect(page.getByText('Heard:',{exact:false})).toContainText(savedLabel.toUpperCase());
  await page.screenshot({path:'test-results/mic-listening.png',fullPage:true});
  await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
  await expect(page.getByText('Mic is off',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadPending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const stream=await(await downloadPending).createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
  const result=JSON.parse(Buffer.concat(chunks).toString()).filter((row:any)=>row.episode==='voice-interim-demo.mp4');
  const expected={episode:'voice-interim-demo.mp4',label:savedLabel,start_sec:2,end_sec:4};
  expect(result).toContainEqual(expected);
  console.log('SHARED MIC HANDLER: start @ 2 -> stop @ 4 -> saved label: PASS\nVIDEO PLAYED: '+played+'\nVIDEO PAUSED: '+paused+'\nCONVEX SAVE + PAGE REFRESH: PASS\nSAVED_SEGMENT\n'+JSON.stringify(result.find((row:any)=>row.label===savedLabel&&row.start_sec===2&&row.end_sec===4),null,2));
  await page.screenshot({path:'test-results/voice-labels.png',fullPage:true});
 // Unsupported-browser message.
 await page.addInitScript(()=>{delete (window as any).SpeechRecognition;delete (window as any).webkitSpeechRecognition;});
 await page.reload();
 await expect(page.getByText('Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeDisabled();
});
