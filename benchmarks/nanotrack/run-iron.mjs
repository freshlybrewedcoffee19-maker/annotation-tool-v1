import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await fs.readFile('benchmarks/nanotrack/manifest.json','utf8'));
for(const file of manifest.files){const bytes=await fs.readFile(`benchmarks/nanotrack/${file.name}`);assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto('https://precious-fish-294.convex.site/');await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const video=await page.request.get(await page.locator('video').evaluate(v=>v.currentSrc));if(!video.ok())throw Error('Trial download failed');const bytes=await video.body();await fs.writeFile('benchmarks/nanotrack/iron-trial.mp4',bytes);
 const requests=[];await page.goto('http://127.0.0.1:5185/iron.html');page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5185/')&&!r.url().startsWith('blob:'))requests.push(r.url());});
 const initialBox=[142,85,130,90];const result=await page.evaluate(box=>window.trackIron(box),initialBox);
 await fs.mkdir('outputs',{recursive:true});for(const s of result.snapshots??[]){const png=Buffer.from(s.png.split(',')[1],'base64');await fs.writeFile(`outputs/iron-frame-${s.index}.png`,png);s.sha256=createHash('sha256').update(png).digest('hex');delete s.png;}
 const report={measuredAt:new Date().toISOString(),browserVersion:browser.version(),hardware:await page.evaluate(()=>({userAgent:navigator.userAgent,logicalProcessors:navigator.hardwareConcurrency})),modelManifest:manifest,sourceSha256:createHash('sha256').update(bytes).digest('hex'),initialBox,referenceMethod:'Developer hand-selected enclosing visible iron box at 11 sec after inspecting decoded frame 0; hand partly occludes iron. No user approval or accuracy ground truth implied.',remoteRequestsDuringInference:requests,...result};await fs.writeFile('benchmarks/nanotrack/iron-results.json',JSON.stringify(report,null,2));
 assert.equal(report.error,undefined);assert.equal(report.decoded.length,51);assert.equal(report.cases[0].rows.length,50);assert.ok(report.decoded.every(r=>Math.abs(r.requestedTime-r.mediaTime)<.1));assert.ok(report.cases[0].rows.every(r=>r.acceptedBox===null&&r.state==='Needs checking'));assert.equal(requests.length,0);assert.ok(new Set(report.snapshots.map(s=>s.sha256)).size>1);
 console.log(JSON.stringify({frames:report.decoded.length,distinctSnapshots:new Set(report.snapshots.map(s=>s.sha256)).size,remoteRequests:requests,wallMs:report.wallMs}));
}finally{await browser.close();}
