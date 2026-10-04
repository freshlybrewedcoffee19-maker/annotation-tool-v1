import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();await page.locator('video').waitFor();
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const footage=await page.request.get(await page.locator('video').evaluate(v=>v.currentSrc));await fs.writeFile('benchmarks/nanotrack/trial.mp4',await footage.body());
 const result=await page.locator('video').evaluate(async v=>{
  const response=await fetch(v.currentSrc);const blob=await response.blob();const copy=document.createElement('video');copy.src=URL.createObjectURL(blob);await new Promise((resolve,reject)=>{copy.onloadeddata=resolve;copy.onerror=reject;});
  await new Promise(resolve=>{copy.onseeked=resolve;copy.currentTime=2;});
  const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');ctx.drawImage(copy,0,0,640,360);ctx.getImageData(0,0,1,1);
  return {bytes:blob.size,width:v.videoWidth,height:v.videoHeight,duration:v.duration,blobPixelsReadable:true,png:c.toDataURL()};
 });
 await fs.writeFile('benchmarks/nanotrack/trial-frame.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;await fs.writeFile('benchmarks/nanotrack/pixel-access.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
