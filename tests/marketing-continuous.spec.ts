import {test,expect} from '@playwright/test';
test.use({launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},permissions:['microphone']});
test('voice only advances consecutive clips while saves are delayed, failed and retried',async({page})=>{
 await page.addInitScript(()=>{class Speech{continuous=false;interimResults=false;lang='';onresult:any;onend:any;onspeechstart:any;results:any[]=[];start(){(window as any).say=(text:string,index:number,final=true)=>{this.results[index]={isFinal:final,0:{transcript:text}};this.onresult?.({resultIndex:index,results:this.results});};(window as any).speechStart=()=>this.onspeechstart?.();}abort(){}};(window as any).SpeechRecognition=Speech;});
 await page.goto('http://127.0.0.1:5176/video-feedback/cards/preview-video?example=1');
 await page.evaluate(()=>{sessionStorage.setItem('preview-hold-saves','1');sessionStorage.setItem('preview-fail-save-text','Start with the logo instead.');});
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThan(1);
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();await expect(page.getByRole('button',{name:'Turn mic off',exact:true})).toBeVisible();
 const say=async(text:string,index:number,time?:number,final=true)=>page.evaluate(({text,index,time,final})=>{if(time!==undefined)document.querySelector('video')!.currentTime=time;(window as any).speechStart();(window as any).say(text,index,final);},{text,index,time,final});
 await say('start',0,.4);await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('0.400');await say('stop',1,.8);await expect(page.getByLabel('Stop (seconds)',{exact:true})).toHaveValue('0.800');await say('start',2,.8);await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('0.800'); // Empty clip is replaced.
 await expect(page.getByRole('article',{name:'Queued feedback',exact:true})).toHaveCount(0);
 await say('stop',3,1.5);await expect(page.getByText('Speak your feedback. Say ‘start’ for the next clip, or choose Save feedback.',{exact:true})).toBeVisible();
 await expect(page.getByText(/^Audio captured:/)).toBeVisible();await say('Shorten this opening.',4);await say('start',5,1.5,false);await say('start',5,1.5,true);await say('start',5,1.7,true);
 await expect(page.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1.500');await expect(page.getByLabel('Stop (seconds)',{exact:true})).toHaveValue('');await expect(page.getByRole('article',{name:'Queued feedback',exact:true})).toHaveCount(1);
 await expect(page.getByText('Saving feedback…',{exact:true})).toBeVisible();await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>!video.paused)).toBe(true);
 await say('stop',6,2.5);await expect(page.getByText(/^Audio captured:/)).toBeVisible();await say('start',7,undefined,false);await say('Start with the logo instead.',7);await say('Start with the logo instead.',7);
 await expect(page.getByLabel('Feedback transcript',{exact:true})).toHaveValue('Start with the logo instead.');await expect(page.getByRole('article',{name:'Queued feedback',exact:true})).toHaveCount(1);
 await say('start',8,2.5);await say('stop',9,3.5);await expect(page.getByText(/^Audio captured:/)).toBeVisible();await say('Keep the start of the second shot.',10);await page.getByRole('button',{name:'Save feedback',exact:true}).click();
 await expect(page.getByRole('article',{name:'Queued feedback',exact:true})).toHaveCount(3);
 await page.getByText('Export feedback',{exact:true}).click();await expect(page.getByText(/must finish saving before it can be included/)).toBeVisible();
 await page.evaluate(()=>{sessionStorage.removeItem('preview-hold-saves');(window as any).__releaseMarketingSaves();});await expect(page.getByRole('button',{name:'Retry saving feedback'})).toBeVisible();await expect(page.getByLabel('Queued feedback transcript',{exact:true})).toHaveValue('Start with the logo instead.');
 await page.getByRole('button',{name:'Retry saving feedback'}).click();await expect(page.getByRole('heading',{name:'Saved feedback (4)',exact:true})).toBeVisible();
 const table=page.getByRole('region',{name:'Saved feedback',exact:true});
 for(const [text,start,end] of [['Shorten this opening.','0.80','1.50'],['Start with the logo instead.','1.50','2.50'],['Keep the start of the second shot.','2.50','3.50']]){const row=table.getByRole('row').filter({hasText:text});await expect(row).toHaveCount(1);await expect(row.getByRole('cell').nth(2)).toHaveText(start);await expect(row.getByRole('cell').nth(3)).toHaveText(end);}
 const audioSources=new Set<string>();
 for(const text of ['Shorten this opening.','Start with the logo instead.','Keep the start of the second shot.']){await table.getByRole('row').filter({hasText:text}).getByRole('button',{name:'Open feedback',exact:true}).click();const audio=page.getByLabel('Original voice recording',{exact:true});await expect(audio).toBeVisible();audioSources.add((await audio.getAttribute('src'))!);const bytes=await audio.evaluate(async(audio:HTMLAudioElement)=>{const buffer=await (await fetch(audio.src)).arrayBuffer();return {size:buffer.byteLength,type:new TextDecoder().decode(new Uint8Array(buffer,8,4))};});expect(bytes.type).toBe('WAVE');expect(bytes.size).toBeGreaterThan(44);}
 expect(audioSources.size).toBe(3);await page.screenshot({path:'outputs/video-feedback-simple-preview/continuous-voice.png',fullPage:true});
});
