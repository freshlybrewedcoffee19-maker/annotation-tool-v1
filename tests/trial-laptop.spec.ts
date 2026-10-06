import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('trial setup, laptop layout and spoken iron hold preserve export names',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.addInitScript(()=>{
  class Speech{continuous=false;interimResults=false;lang='';onstart:any;onend:any;onresult:any;onerror:any;start(){let index=0;const results:any[]=[];(window as any).say=(words:string)=>{results[index]={isFinal:true,0:{transcript:words}};this.onresult({resultIndex:index,results});index++;};this.onstart();}stop(){this.onend?.();}abort(){}}
  (window as any).SpeechRecognition=Speech;
 });
 await page.goto('/');const button=page.getByRole('button',{name:'Try a sample video',exact:true});await expect(button).toBeEnabled();
 await page.evaluate(()=>{(window as any).setupSeen=false;const observer=new MutationObserver(()=>{if(document.querySelector('.sample-loading progress'))(window as any).setupSeen=true;});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});});
 await button.click();await expect(page.locator('#panel-annotate')).toBeVisible();await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>(window as any).setupSeen)).toBe(true);
 await expect(page.getByLabel('Saved labels')).toHaveText('initial stateapproachpositionrepositionslipiron hold');
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(3);
 const videoBox=await page.locator('video').boundingBox(),micBox=await page.getByRole('button',{name:'Turn mic on',exact:true}).boundingBox();expect(videoBox!.y+videoBox!.height).toBeLessThanOrEqual(800);expect(micBox!.y+micBox!.height).toBeLessThanOrEqual(800);expect(await page.evaluate(()=>window.scrollY)).toBe(0);
 await page.locator('video').evaluate((v:HTMLVideoElement)=>v.play());await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0.1);await page.locator('video').evaluate((v:HTMLVideoElement)=>v.pause());
 await fs.mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/annotate-1280x800.png',fullPage:false});
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 for(const [words,time] of [['start',2],['stop',4],['iron hold',4]] as const){await page.locator('video').evaluate((v:HTMLVideoElement,time:number)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>time}),time);await page.evaluate(words=>(window as any).say(words),words);}
 await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('iron hold');
 await page.getByText('More tools',{exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();const stream=await(await pending).createReadStream();const chunks=[];for await(const c of stream!)chunks.push(c);const rows=JSON.parse(Buffer.concat(chunks).toString());expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({label:'iron_hold',start_sec:2,end_sec:4});
 const output='SETUP MESSAGE + DISABLED BUTTON: PASS\n1280x800 VIDEO + MIC WITHOUT SCROLLING: PASS\nHEARD: iron hold\nDISPLAYED LABEL: iron hold\nEXPORTED LABEL: iron_hold\nSAVED SEGMENT\n'+JSON.stringify(rows[0],null,2);console.log(output);await fs.writeFile('outputs/iron-hold-proof.txt',output+'\n');
});

