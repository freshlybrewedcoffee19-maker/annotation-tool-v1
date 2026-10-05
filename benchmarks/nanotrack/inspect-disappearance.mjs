import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
// Inspect the consented trial across its full duration before choosing any accuracy references.
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto('https://precious-fish-294.convex.site/');await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const result=await page.evaluate(async()=>{
  const source=document.querySelector('video');const blob=await (await fetch(source.currentSrc)).blob();const v=document.createElement('video');v.src=URL.createObjectURL(blob);await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});
  const times=[11,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44];const c=document.createElement('canvas');c.width=1280;c.height=Math.ceil(times.length/4)*202;const ctx=c.getContext('2d');
  for(let i=0;i<times.length;i++){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Decoded frame timeout')),10000);const frame=(_,m)=>{if(Math.abs(m.mediaTime-times[i])<.1){clearTimeout(timer);resolve();}else v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);v.currentTime=times[i];});const x=i%4*320,y=Math.floor(i/4)*202;ctx.drawImage(v,x,y,320,180);ctx.fillStyle='#111';ctx.fillRect(x,y+180,320,22);ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.fillText(times[i].toFixed(1)+' sec',x+8,y+196);}
  return {duration:v.duration,times,png:c.toDataURL()};
 });await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/live-trial-after-11.png',Buffer.from(result.png.split(',')[1],'base64'));console.log(JSON.stringify({duration:result.duration,inspectedTimes:result.times}));
}finally{await browser.close();}

