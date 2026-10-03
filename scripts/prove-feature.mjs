import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const feature=process.argv[2];const smoke=process.argv.includes('--smoke');
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage();
await page.goto(process.env.APP_URL??'http://127.0.0.1:5173');
await expect(page.getByLabel('Upload video',{exact:true})).toBeEnabled();
await expect(page.getByLabel('Label list',{exact:true})).toBeEnabled();
const output=[];const log=text=>{output.push(text);console.log(text);};
const label=(await page.getByLabel('Label list',{exact:true}).inputValue()).split('\n').filter(Boolean)[0];
const episode=()=>page.getByLabel('Episode',{exact:true}).evaluate(e=>e.selectedOptions[0].text);
async function upload(ext='mp4'){
 const name=`feature-${feature}-${Date.now()}.${ext}`;
 await page.getByLabel('Upload video',{exact:true}).setInputFiles({name,mimeType:ext==='mov'?'video/quicktime':ext==='webm'?'video/webm':'video/mp4',buffer:await fs.readFile(`tests/fixtures/short.${ext}`)});
 await expect(page.getByRole('button',{name:'Add segment',exact:true})).toBeEnabled();
 await expect.poll(episode).toBe(name);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);
 await expect(page.locator('tbody tr')).toHaveCount(0);return name;
}
async function segment(start,end){const count=await page.locator('tbody tr').count();await page.getByLabel('Start (seconds)',{exact:true}).fill(String(start));await page.getByLabel('End (seconds)',{exact:true}).fill(String(end));await page.getByLabel('Label',{exact:true}).selectOption(label);await page.getByRole('button',{name:'Add segment',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(count+1);}
async function seek(time){await page.locator('video').evaluate((v,time)=>{v.pause();v.currentTime=time;},time);await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBe(time);}
async function download(name){const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const file=await pending;const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);return {name:file.suggestedFilename(),text:Buffer.concat(chunks).toString('utf8')};}
try{
 if(smoke){await expect(page.getByRole('button',{name:'Load sample video',exact:true})).toBeVisible();log(`HOSTED FEATURE ${feature}: page loaded; Convex connected`);}
 else{
 await upload();
 if(feature==='2'){
  log('UPLOAD ACCEPTS: '+await page.getByLabel('Upload video',{exact:true}).getAttribute('accept'));
  for(const ext of ['mov','webm']){await upload(ext);await page.locator('video').evaluate(v=>v.play());await expect.poll(()=>page.locator('video').evaluate(v=>v.paused)).toBe(false);log(`${ext.toUpperCase()} PLAYED: ${await page.locator('video').evaluate(v=>!v.paused)}`);await page.locator('video').evaluate(v=>v.pause());}
  await page.getByRole('button',{name:'Load sample video',exact:true}).click();await expect.poll(episode).toBe('sample.mp4');await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);log('SAMPLE EPISODE: '+await episode());await segment(0,1);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);log('SAMPLE SEGMENT AFTER REFRESH: '+(await page.locator('tbody tr').innerText()).replaceAll('\t',' | '));
 }
 else if(feature==='8'){
  await seek(1);await page.locator('video').focus();await page.keyboard.press('[');await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1.000');
  await seek(2);await page.locator('video').focus();await page.keyboard.press(']');await expect(page.getByLabel('End (seconds)',{exact:true})).toHaveValue('2.000');
  await page.keyboard.press('Space');await expect.poll(()=>page.locator('video').evaluate(v=>v.paused)).toBe(false);log('SPACE PLAYED: '+await page.locator('video').evaluate(v=>!v.paused));
  await page.keyboard.press('Space');await expect.poll(()=>page.locator('video').evaluate(v=>v.paused)).toBe(true);log('SPACE PAUSED: '+await page.locator('video').evaluate(v=>v.paused));
  log('KEYBOARD MARKS: start='+await page.getByLabel('Start (seconds)',{exact:true}).inputValue()+'; end='+await page.getByLabel('End (seconds)',{exact:true}).inputValue());
  const before=await page.getByLabel('Label list',{exact:true}).inputValue();await page.getByLabel('Label list',{exact:true}).focus();await page.keyboard.press('End');await page.keyboard.type('[');await expect(page.getByLabel('Label list',{exact:true})).toHaveValue(before+'[');log('TYPING [ IN LABEL LIST: inserted text; start remained '+await page.getByLabel('Start (seconds)',{exact:true}).inputValue());
  await page.getByLabel('Label list',{exact:true}).fill(before);await segment(1,2);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);log('SAVED SEGMENT: '+(await page.locator('tbody tr').innerText()).replaceAll('\t',' | '));
 }
 else if(feature==='9'){
  await seek(3);await page.getByRole('button',{name:'Start at 0 seconds',exact:true}).click();await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('0');await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBe(0);log('START AT ZERO: field='+await page.getByLabel('Start (seconds)',{exact:true}).inputValue()+'; video='+await page.locator('video').evaluate(v=>v.currentTime));
  await segment(0,1.25);await page.getByRole('button',{name:'Start at previous end',exact:true}).click();await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1.250');await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBe(1.25);log('PREVIOUS END: field='+await page.getByLabel('Start (seconds)',{exact:true}).inputValue()+'; video='+await page.locator('video').evaluate(v=>v.currentTime));
  await page.getByLabel('End (seconds)',{exact:true}).fill('2.5');await page.getByRole('button',{name:'Add segment',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(2);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(2);log('AFTER REFRESH:\n'+(await page.locator('tbody').innerText()).replaceAll('\t',' | '));
 }
 else if(feature==='10'){
  await page.getByLabel('Start (seconds)',{exact:true}).fill('1.25');await page.getByLabel('End (seconds)',{exact:true}).fill('3.75');await expect(page.getByLabel('Segment preview',{exact:true})).toContainText('2.500 sec');log('SEGMENT PREVIEW:\n'+await page.getByLabel('Segment preview',{exact:true}).innerText());await segment(1.25,3.75);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);log('AFTER REFRESH: '+(await page.locator('tbody tr').innerText()).replaceAll('\t',' | '));
 }
 else if(feature==='3'){
  const details=await page.getByLabel('Video details',{exact:true}).innerText();await expect(page.getByLabel('Video details',{exact:true})).toContainText('video/mp4');const dimensions=await page.locator('video').evaluate(v=>`${v.videoWidth} x ${v.videoHeight}`);await expect(page.getByLabel('Video details',{exact:true})).toContainText(dimensions);log(details);await page.reload();await expect(page.getByLabel('Video details',{exact:true})).toHaveText(details,{useInnerText:true});log('VIDEO DETAILS AFTER REFRESH: unchanged');
 }
 else if(feature==='7'){
  await page.getByLabel('Frame rate (FPS)',{exact:true}).fill('25');await page.getByRole('button',{name:'Save frame rate',exact:true}).click();await expect(page.getByText('Frame rate saved.',{exact:true})).toBeVisible();await seek(2);await expect(page.getByLabel('Frame readout',{exact:true})).toContainText('Current frame: 50');await page.getByLabel('Start (seconds)',{exact:true}).fill('1');await page.getByLabel('End (seconds)',{exact:true}).fill('3.5');await expect(page.getByLabel('Boundary frames',{exact:true})).toHaveText('Start frame: 25; End frame: 88');log('FPS: '+await page.getByLabel('Frame rate (FPS)',{exact:true}).inputValue());log('VIDEO TIME: '+await page.locator('video').evaluate(v=>v.currentTime));log(await page.getByLabel('Frame readout',{exact:true}).locator('p').innerText());log(await page.getByLabel('Boundary frames',{exact:true}).innerText());await page.reload();await expect(page.getByLabel('Frame rate (FPS)',{exact:true})).toHaveValue('25');log('FPS AFTER REFRESH: '+await page.getByLabel('Frame rate (FPS)',{exact:true}).inputValue());
 }
 else if(feature==='14'){
  await page.getByLabel('Frame rate (FPS)',{exact:true}).fill('25');await page.getByRole('button',{name:'Save frame rate',exact:true}).click();await expect(page.getByText('Frame rate saved.',{exact:true})).toBeVisible();await segment(1,3);await expect(page.locator('tbody tr')).toContainText('ANN_001');log('RECORD: '+(await page.locator('tbody tr').innerText()).replaceAll('\t',' | '));await page.locator('tbody tr').getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('End (seconds)',{exact:true}).fill('3.5');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('tbody tr')).toContainText('2.500');await page.reload();await expect(page.locator('tbody tr')).toContainText('ANN_001');log('EDIT + REFRESH: '+(await page.locator('tbody tr').innerText()).replaceAll('\t',' | '));
 }
 else if(feature==='12'){
  await segment(0,1);await segment(0.5,2);await expect(page.getByLabel('Coverage checks',{exact:true})).toContainText(/0[.]500.1[.]000 sec/);log(await page.getByLabel('Coverage checks',{exact:true}).innerText());await page.reload();await expect(page.getByLabel('Coverage checks',{exact:true})).toContainText(/0[.]500.1[.]000 sec/);log('AFTER REFRESH: same gaps and overlaps');
 }
 else throw new Error('No proof defined for feature '+feature);
 await page.screenshot({path:`test-results/feature-${feature}.png`,fullPage:true});
 await fs.appendFile('FEATURE_PROOFS.md',`\n## Feature ${feature}\n\n\`\`\`text\n${output.join('\n')}\n\`\`\`\n`);
 }
}finally{await browser.close();}
