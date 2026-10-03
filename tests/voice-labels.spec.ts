import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createVoiceSegments,type VoiceSegment} from '../src/voice-segments';
test('start at 2, stop at 5, then a saved label uses the mic handler and saves',async({page})=>{
 const segments:VoiceSegment[]=[];
 const handler=createVoiceSegments(segment=>segments.push(segment));
 handler.hear('START now!',2,['Iron stroke']);
 handler.hear('please STOP.',5,['Iron stroke']);
 expect(segments).toEqual([]);
 handler.hear('please Iron stroke.',5,['Iron stroke']);
 expect(segments).toEqual([{label:'Iron stroke',start_sec:2,end_sec:5}]);
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
   start(){(window as any).feedWords=(words:string)=>this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:words}}]});this.onstart?.();}
   stop(){this.onend?.();}abort(){}
  }
  (window as any).SpeechRecognition=FakeSpeech;
 });
 await page.goto('/');
 await expect(page.getByLabel('Label list',{exact:true})).toBeEnabled();
 const savedLabels=(await page.getByLabel('Label list',{exact:true}).inputValue()).split('\n').filter(Boolean);
 const savedLabel=savedLabels.find(label=>label.toLowerCase()==='iron stroke')??savedLabels[0];
 expect(savedLabel).toBeTruthy();
  await page.getByLabel('Upload MP4',{exact:true}).setInputFiles({name:'voice-commands-demo.mp4',mimeType:'video/mp4',buffer:await fs.readFile('tests/fixtures/short.mp4')});
  await expect(page.getByRole('button',{name:'Add segment',exact:true})).toBeEnabled();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('video').evaluate(async(v:HTMLVideoElement)=>{v.pause();Object.defineProperty(v,'currentTime',{configurable:true,get:()=>2});});
  await page.getByRole('button',{name:'Mic on',exact:true}).click();
  await expect(page.getByRole('button',{name:'Mic off',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('status')).toContainText('Waiting for: start');
  await page.evaluate(()=>(window as any).feedWords('START now!'));
  await expect(page.getByRole('status')).toContainText('Waiting for: stop');
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>5}));
  await page.evaluate(()=>(window as any).feedWords('please STOP.'));
  await expect(page.getByRole('status')).toContainText('Waiting for: a label');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.evaluate(label=>(window as any).feedWords(`please ${label.toUpperCase()}.`),savedLabel);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Waiting for: start');
  await expect(page.getByText('Heard:',{exact:false})).toContainText(savedLabel.toUpperCase());
  await page.getByRole('button',{name:'Mic off',exact:true}).click();
  await expect(page.getByRole('button',{name:'Mic on',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadPending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const stream=await(await downloadPending).createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
  const result=JSON.parse(Buffer.concat(chunks).toString()).filter((row:any)=>row.episode==='voice-commands-demo.mp4');
  const expected={episode:'voice-commands-demo.mp4',label:savedLabel,start_sec:2,end_sec:5};
  expect(result).toContainEqual(expected);
  console.log('SHARED MIC HANDLER: start now @ 2 -> stop @ 5 -> Iron stroke.: PASS\nPAUSED VIDEO: start @ 2 -> stop @ 5 -> saved label: PASS\nCONVEX SAVE + PAGE REFRESH: PASS\nRESULTING_SEGMENT\n'+JSON.stringify(result.find((row:any)=>row.label===savedLabel&&row.start_sec===2&&row.end_sec===5),null,2));
  await page.screenshot({path:'test-results/voice-labels.png',fullPage:true});
 // Unsupported-browser message.
 await page.addInitScript(()=>{delete (window as any).SpeechRecognition;delete (window as any).webkitSpeechRecognition;});
 await page.reload();
 await expect(page.getByText('Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Mic on',exact:true})).toBeDisabled();
});
