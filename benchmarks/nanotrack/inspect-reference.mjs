import {chromium} from '@playwright/test';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5185');
 const png=await page.evaluate(async()=>{
  const v=document.createElement('video');v.src='./trial.mp4';await new Promise(r=>v.onloadeddata=r);const c=document.createElement('canvas');c.width=960;c.height=400;const ctx=c.getContext('2d');
  for(let i=0;i<6;i++){const time=2+i*2;await new Promise(r=>{v.onseeked=r;v.currentTime=time;});ctx.drawImage(v,(i%3)*320,Math.floor(i/3)*200,320,180);ctx.fillStyle='white';ctx.fillText(time+' seconds',(i%3)*320+5,Math.floor(i/3)*200+195);}
  return c.toDataURL();
 });await fs.writeFile('benchmarks/nanotrack/reference-contact.png',Buffer.from(png.split(',')[1],'base64'));
}finally{await browser.close();}
