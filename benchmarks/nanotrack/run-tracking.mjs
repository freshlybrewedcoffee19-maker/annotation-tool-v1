import {chromium} from '@playwright/test';import fs from 'node:fs/promises';
const results=[];
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true});try{
  const page=await browser.newPage();const remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5185/')&&!r.url().startsWith('blob:'))remote.push(r.url());});await page.goto('http://127.0.0.1:5185');
  const adapter=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter();return a?{vendor:a.info.vendor,architecture:a.info.architecture,description:a.info.description,isFallbackAdapter:a.info.isFallbackAdapter}:null;});
  for(const provider of ['wasm','webgpu']){const result=await page.evaluate(p=>window.track(p),provider);results.push({channel,provider,adapter,remoteRequests:remote,...result});console.log(channel,provider,result.error??result.cases.map(c=>({name:c.name,processingMs:c.processingMs,meanInferenceMs:c.rows.reduce((s,r)=>s+r.inferenceMs,0)/50})));}
 }finally{await browser.close();}
}
await fs.writeFile('benchmarks/nanotrack/tracking-results.json',JSON.stringify(results,null,2));
