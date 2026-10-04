import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const results=[];
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5185');
  const hardware=await page.evaluate(async()=>({userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory,webgpu:!!navigator.gpu,adapter:navigator.gpu?(await navigator.gpu.requestAdapter())?.info:null}));
  for(const provider of ['wasm','webgpu'])for(let run=0;run<2;run++){
   const result=await page.evaluate(provider=>window.run(provider),provider);results.push({channel,run,hardware,...result});console.log(JSON.stringify(results.at(-1)));
  }
 }finally{await browser.close();}
}
await fs.writeFile('benchmarks/nanotrack/results.json',JSON.stringify(results,null,2));
