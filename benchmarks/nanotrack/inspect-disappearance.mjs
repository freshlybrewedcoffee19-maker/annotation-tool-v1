import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
// Inspect the consented trial across its full duration before choosing any accuracy references.
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5185');
 const result=await page.evaluate(async()=>{
  const v=document.createElement('video');v.src='./trial.mp4';await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});
  const times=Array.from({length:23},(_,i)=>Math.min(.1+i*2,v.duration-.1));const c=document.createElement('canvas');c.width=1280;c.height=Math.ceil(times.length/4)*202;const ctx=c.getContext('2d');
  for(let i=0;i<times.length;i++){await new Promise(resolve=>{v.onseeked=resolve;v.currentTime=times[i];});const x=i%4*320,y=Math.floor(i/4)*202;ctx.drawImage(v,x,y,320,180);ctx.fillStyle='#111';ctx.fillRect(x,y+180,320,22);ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.fillText(times[i].toFixed(1)+' sec',x+8,y+196);}
  return {duration:v.duration,times,png:c.toDataURL()};
 });await fs.mkdir('outputs',{recursive:true});await fs.writeFile('outputs/trial-disappearance-contact.png',Buffer.from(result.png.split(',')[1],'base64'));console.log(JSON.stringify({duration:result.duration,inspectedTimes:result.times}));
}finally{await browser.close();}
