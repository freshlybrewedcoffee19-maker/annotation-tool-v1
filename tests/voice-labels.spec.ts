import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createVoiceSegments,type VoiceSegment} from '../src/voice-segments';
test('grasp then stop uses the mic handler and saves the resulting segment',async({page})=>{
 const segments:VoiceSegment[]=[];
 const handler=createVoiceSegments(segment=>segments.push(segment));
 handler.hear('grasp',1,true,['grasp']);
 expect(segments).toEqual([]);
 handler.hear('stop',3,true,['grasp']);
 expect(segments).toEqual([{label:'grasp',start_sec:1,end_sec:3}]);
 // Check other-label boundaries, duplicate labels, unknown speech and paused playback.
 const boundaries:VoiceSegment[]=[];const second=createVoiceSegments(segment=>boundaries.push(segment));
 second.hear('grasp',0,false,['grasp','release']);
 second.hear('unknown',0,true,['grasp','release']);
 second.hear('Grasp.',1,true,['grasp','release']);
 second.hear('grasp',2,true,['grasp','release']);
 second.hear('release',3,true,['grasp','release']);
 second.hear('stop',4,true,['grasp','release']);
 expect(boundaries).toEqual([{label:'grasp',start_sec:1,end_sec:3},{label:'release',start_sec:3,end_sec:4}]);
 await page.addInitScript(()=>{
  class FakeSpeech {
   continuous=false;interimResults=false;lang='';onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror=null;onresult:((event:unknown)=>void)|null=null;
   start(){(window as any).feedWords=(words:string)=>this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:words}}]});this.onstart?.();}
   stop(){this.onend?.();}abort(){}
  }
  (window as any).SpeechRecognition=FakeSpeech;
 });
 await page.goto('/');
 const labelInput=page.getByLabel('Label list',{exact:true});await expect(labelInput).toBeEnabled();
 const originalLabels=await labelInput.inputValue();
 try{
  await labelInput.fill([...new Set([...originalLabels.split('\n'),'grasp'])].join('\n'));
  await page.getByRole('button',{name:'Save labels',exact:true}).click();
  await expect(page.getByLabel('Label',{exact:true}).locator('option')).toContainText(['grasp']);
  await page.getByLabel('Upload MP4',{exact:true}).setInputFiles({name:'voice-demo.mp4',mimeType:'video/mp4',buffer:await fs.readFile('tests/fixtures/short.mp4')});
  await expect(page.getByRole('button',{name:'Add segment',exact:true})).toBeEnabled();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('video').evaluate(async(v:HTMLVideoElement)=>{await v.play();Object.defineProperty(v,'currentTime',{configurable:true,get:()=>1});});
  await page.getByRole('button',{name:'Mic on',exact:true}).click();
  await expect(page.getByRole('button',{name:'Mic off',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>(window as any).feedWords('grasp'));
  await expect(page.getByText('Open segment:',{exact:false})).toContainText('grasp');
  await page.locator('video').evaluate((v:HTMLVideoElement)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>3}));
  await page.evaluate(()=>(window as any).feedWords('stop'));
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('Heard:',{exact:false})).toContainText('stop');
  await page.getByRole('button',{name:'Mic off',exact:true}).click();
  await expect(page.getByRole('button',{name:'Mic on',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadPending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const stream=await(await downloadPending).createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
  const result=JSON.parse(Buffer.concat(chunks).toString()).filter((row:any)=>row.episode==='voice-demo.mp4');
  expect(result).toContainEqual({episode:'voice-demo.mp4',label:'grasp',start_sec:1,end_sec:3});
  console.log('WORDS: grasp @ 1 sec -> stop @ 3 sec\nSHARED MIC HANDLER: PASS\nCONVEX SAVE + PAGE REFRESH: PASS\nRESULTING_SEGMENT\n'+JSON.stringify({episode:'voice-demo.mp4',...segments[0]},null,2));
  await page.screenshot({path:'test-results/voice-labels.png',fullPage:true});
 }finally{
  await page.getByLabel('Label list',{exact:true}).fill(originalLabels);
  await page.getByRole('button',{name:'Save labels',exact:true}).click();
  await expect(page.getByLabel('Label list',{exact:true})).toHaveValue(originalLabels);
 }
 // Unsupported-browser message.
 await page.addInitScript(()=>{delete (window as any).SpeechRecognition;delete (window as any).webkitSpeechRecognition;});
 await page.reload();
 await expect(page.getByText('Speech recognition is not supported in this browser. Open this page in Chrome to use voice labelling.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Mic on',exact:true})).toBeDisabled();
});
