import {test,expect,devices} from '@playwright/test';

// Real marketing UI and saving queue; the preview server keeps all account/data operations in memory.
const base=process.env.MARKETING_PREVIEW_URL??'http://127.0.0.1:5181';
const live=process.env.MARKETING_LIVE_SMOKE==='1';
test.use({launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},permissions:['microphone']});
for(const device of ['iPhone 13','Pixel 7','Desktop Chrome'] as const){
 const {defaultBrowserType,...deviceOptions}=devices[device];
 test.describe(device,()=>{
  test.use(deviceOptions);
  test('voice commands save consecutive feedback with the correct phone capture mode',async({page})=>{
   // Production runs use only the in-tab sample; block database and all off-origin connections.
   await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
   await page.routeWebSocket('**/*',socket=>socket.close());
   await page.addInitScript(()=>{
    const state={audioRequests:0,starts:0,synchronousStart:false,playFromTap:false};
    (window as any).voiceCheck=state;
    let inClick=false;
    document.addEventListener('click',()=>{inClick=true;setTimeout(()=>{inClick=false;},0);},true);
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){if(inClick)state.playFromTap=true;return play.call(this);};
    const getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async constraints=>{state.audioRequests++;if(/iPhone|Android/.test(navigator.userAgent))throw Error('A phone must not open a competing microphone recorder.');return getUserMedia(constraints);};
    class Speech{
     continuous=false;interimResults=false;lang='';onstart:any;onend:any;onerror:any;onresult:any;onspeechstart:any;onspeechend:any;results:any[]=[];active=false;
     start(){this.active=true;state.starts++;if(inClick)state.synchronousStart=true;(window as any).voice=this;queueMicrotask(()=>this.active&&this.onstart?.());}
     abort(){this.active=false;}
     say(text:string,final=true){const updating=this.results.length>0&&!this.results.at(-1).isFinal,index=updating?this.results.length-1:this.results.length;if(!updating)this.onspeechstart?.();this.results[index]={isFinal:final,0:{transcript:text}};this.onresult?.({resultIndex:index,results:this.results});if(final){this.onspeechend?.();if(!this.continuous){this.active=false;this.onend?.();}}}
    }
    Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:Speech});
   });
   await page.goto(base+'/video-feedback/sample');
   await expect.poll(()=>page.locator('video').evaluate(video=>(video as HTMLVideoElement).readyState)).toBeGreaterThan(1);
   await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
   await expect(page.getByRole('button',{name:'Turn mic off',exact:true})).toBeVisible();
   const say=async(text:string,time?:number)=>{
    await expect.poll(()=>page.evaluate(()=>(window as any).voice?.active===true)).toBe(true);
    await page.evaluate(({text,time})=>{const video=document.querySelector('video')!;if(time!==undefined)video.currentTime=time;(window as any).voice.say(text);},{text,time});
   };
   await say('start',.5);
   await expect.poll(()=>page.locator('video').evaluate(video=>!(video as HTMLVideoElement).paused)).toBe(true);
   await say('stop',2);
   await expect.poll(()=>page.locator('video').evaluate(video=>(video as HTMLVideoElement).paused)).toBe(true);
   await say('Make the product name bigger.');
   await expect(page.locator('.feedback-segment-key')).toContainText('Make the product name bigger.');
   await expect(page.locator('.feedback-segment-key')).toHaveCount(1);
   if(device!=='Desktop Chrome')await expect(page.locator('.feedback-compact-audio-notice')).toHaveText('Spoken feedback saves as text.');
   await say('start',2);
   await expect.poll(()=>page.locator('video').evaluate(video=>!(video as HTMLVideoElement).paused)).toBe(true);
   await say('stop',4);
   await say('Keep the ending.');
   await page.getByRole('button',{name:'Edit draft',exact:true}).click();
   await expect(page.getByRole('textbox',{name:'Feedback transcript',exact:true})).toHaveValue('Keep the ending.');
   await page.getByRole('button',{name:'Close feedback form',exact:true}).click();
   await expect(page.locator('.feedback-segment-key')).toHaveCount(2);
   await expect(page.locator('.feedback-segment-key').last()).toContainText('Keep the ending.');
   // Interim stop must pause immediately without cutting off the rest of the same utterance.
   await say('start',4);
   await expect.poll(()=>page.locator('video').evaluate(video=>!(video as HTMLVideoElement).paused)).toBe(true);
   await expect.poll(()=>page.evaluate(()=>(window as any).voice?.active===true)).toBe(true);
   await page.evaluate(async()=>{
    const voice=(window as any).voice,video=document.querySelector('video')!;
    video.currentTime=6;voice.say('Stop',false);
    await new Promise(resolve=>setTimeout(resolve,600));
    voice.say('Stop, make the logo bigger',false);
    // Deliberately span the old 300 ms media-refresh race before final speech arrives.
    await new Promise(resolve=>setTimeout(resolve,600));
    voice.say('Stop, make the logo bigger.',true);
   });
   await expect(page.locator('.feedback-segment-key')).toHaveCount(3);
   await expect(page.locator('.feedback-segment-key').last()).toContainText('make the logo bigger.');
   await expect(page.locator('.feedback-segment-key').last()).not.toContainText('Stop,');
   expect(await page.evaluate(()=>(window as any).voiceCheck)).toMatchObject({audioRequests:device==='Desktop Chrome'?1:0,synchronousStart:true,playFromTap:true});
   await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
   await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeVisible();
   if(device!=='Desktop Chrome'){
    const composer=await page.locator('.feedback-compact-composer').boundingBox(),strip=await page.locator('.feedback-segments').boundingBox();
    expect(composer!.y+composer!.height).toBeLessThanOrEqual(strip!.y);
   }
   await page.screenshot({path:`outputs/mobile-voice-20261016/${live?'live-':''}${device.replaceAll(' ','-')}.png`});
   if(device==='iPhone 13'&&!live){
    // In a private project the composer mounts before its video access ticket arrives.
    await page.route('http://127.0.0.1:5176/api/marketing/media?**',async route=>{
     const response=await route.fetch({url:route.request().url().replace(':5176',':5181')});await route.fulfill({response});
    });
    await page.addInitScript(()=>sessionStorage.setItem('cv-headphones-marketing','dismissed'));
    await page.goto(base+'/video-feedback/cards/preview-video?example=1&delayMedia=1');
    await expect(page.getByText('Preparing private playback…', {exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
    await expect(page.locator('.feedback-compact-error')).toContainText('The video is still loading');
    expect(await page.evaluate(()=>(window as any).voiceCheck.starts)).toBe(0);
    await page.evaluate(()=>(window as any).__releaseMarketingMedia());
    await expect.poll(()=>page.locator('video').evaluate(video=>(video as HTMLVideoElement).readyState)).toBeGreaterThan(1);
    await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
    await expect(page.getByRole('button',{name:'Turn mic off',exact:true})).toBeVisible();
    const starts=await page.evaluate(()=>(window as any).voiceCheck.starts);
    await page.locator('video').dispatchEvent('playing');
    await expect.poll(()=>page.evaluate(()=>(window as any).voiceCheck.starts)).toBeGreaterThan(starts);
    await say('start',.5);await say('stop',2);
    await expect(page.locator('.feedback-compact-state')).toHaveText('Listening for feedback');
    await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
    await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
    await expect(page.locator('.feedback-compact-state')).toHaveText('Listening for feedback');
    await say('Keep this private project comment.');
    await expect(page.locator('.feedback-segment-key')).toHaveCount(2);
    await expect(page.locator('.feedback-segment-key').last()).toContainText('Keep this private project comment.');
   }
  });
 });
}
