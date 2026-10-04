import {chromium} from '@playwright/test';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const results={};try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5185');await page.evaluate(()=>window.cancelAfter=5);results.cancel=await page.evaluate(()=>window.track('wasm'));
 await page.evaluate(async()=>{window.cancelAfter=null;await caches.delete('nanotrack-phase0-v1');});
 await page.route('**/template.onnx',r=>r.fulfill({status:404,body:'Missing benchmark model'}));results.missing=await page.evaluate(()=>window.track('wasm'));if(!results.cancel.cancelled||!results.missing.error?.includes('Missing template.onnx'))throw Error('Failure checks failed');
 console.log({cancelled:results.cancel.cancelled,cancelMs:results.cancel.cancelMs,missing:results.missing.error});await fs.writeFile('benchmarks/nanotrack/failure-results.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
