import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const clip=await fs.readFile('benchmarks/nanotrack/iron-trial.mp4');
const publicClip=await fs.readFile('public/videos/iron-e05a44b0.mp4');
const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(clip),hash(publicClip));
const browser=await chromium.launch({channel:'chrome'});
try{const page=await browser.newPage(),remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5185/')&&!r.url().startsWith('blob:'))remote.push(r.url());});await page.goto('http://127.0.0.1:5185/iron.html');
const run=async diagnostics=>page.evaluate(async diagnostics=>{window.diagnostics=diagnostics;return window.trackIron([142,85,130,90],{startTime:11,step:.2,frameCount:169});},diagnostics);
const diagnostic=await run(true),bounded=await run(false);
for(const result of [diagnostic,bounded]){assert.equal(result.error,undefined);assert.ok(result.decoded.every(f=>Math.abs(f.requestedTime-f.mediaTime)<.1));assert.ok(result.cases[0].rows.every(r=>r.acceptedBox===null));}
const rows=diagnostic.cases[0].rows,stop=rows.findIndex(r=>r.safety.requiresConfirmation);assert.ok(stop>=0);assert.ok(rows.slice(stop).every(r=>r.safety.proposal===null));assert.equal(bounded.cases[0].rows.length,rows[stop].index);assert.equal(remote.length,0);
for(const result of [diagnostic,bounded]){delete result.stopFrame;for(const shot of result.snapshots)delete shot.png;}
const report={measuredAt:new Date().toISOString(),browser:browser.version(),clipSha256:hash(clip),range:{startTime:11,step:.2,lastTime:44.8},firstStop:{index:rows[stop].index,time:11+rows[stop].index*.2,reason:rows[stop].safety.reason,rawScore:rows[stop].raw.score},diagnostic,bounded,remoteRequests:remote,limitations:['Visual inspection at half-second spacing found no complete exit after entry around 9 seconds; a shorter absence between inspected frames is not ruled out.','Ambiguity stop is conservative and is not proof that the iron disappeared.','Real full disappearance and reappearance are not verified by this footage. No accepted annotations or database writes.']};await fs.writeFile('benchmarks/nanotrack/iron-long-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({firstStop:report.firstStop,diagnosticFrames:rows.length,boundedFrames:bounded.cases[0].rows.length,processingMs:diagnostic.cases[0].processingMs,acceptedAnnotations:0,remoteRequests:remote}));
}finally{await browser.close();}
