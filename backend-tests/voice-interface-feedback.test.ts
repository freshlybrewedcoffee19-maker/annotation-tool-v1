// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const fixture=fileURLToPath(new URL('./fixtures/voice-interface-feedback.tsx',import.meta.url));
let browser:Browser,context:BrowserContext|undefined,bundle:string,styles:string;
let pageErrors:string[]=[],unexpectedRequests:string[]=[];
beforeAll(async()=>{
 const built=await build({entryPoints:[fixture],bundle:true,write:false,outdir:'voice-ui-isolated',format:'esm',platform:'browser',jsx:'automatic',plugins:[{name:'voice-ui-boundaries',setup(builder){
  builder.onResolve({filter:/^(\.\/workspace|convex\/react)$/},args=>args.importer.endsWith('VoiceLabels.tsx')?{path:args.path,namespace:'annotation-boundary'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'annotation-boundary'},()=>({contents:`export {useAnnotationWorkspace as useWorkspace,useAnnotationQuery as useQuery,useAnnotationMutation as useMutation} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
  builder.onResolve({filter:/^\.\/(hooks|use-feedback-queue)$/},args=>args.importer.endsWith('FeedbackComposer.tsx')?{path:args.path,namespace:'marketing-boundary'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'marketing-boundary'},()=>({contents:`export {useQuery,useSample,useFeedbackQueue} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
 }}]});
 bundle=built.outputFiles.find(file=>file.path.endsWith('.js'))!.text;styles=built.outputFiles.find(file=>file.path.endsWith('.css'))?.text??'';
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);expect(unexpectedRequests).toEqual([]);});
afterAll(async()=>{await browser?.close();});
async function setup(mode='annotation'){
 context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130',viewport:{width:1280,height:900}});
 const page=await context.newPage();pageErrors=[];unexpectedRequests=[];page.setDefaultTimeout(1500);
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.route('**/*',route=>{if(route.request().url()==='https://voice-ui.test/')return route.fulfill({contentType:'text/html',body:`<style>${styles}</style><div id="root"></div><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`});unexpectedRequests.push(route.request().url());return route.abort();});
 await page.routeWebSocket('**/*',socket=>{unexpectedRequests.push(socket.url());socket.close();});
 await page.clock.install({time:new Date('2026-10-30T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-30T00:00:01Z'));
 await page.goto('https://voice-ui.test/#'+mode);await browserExpect(mic(page)).toBeEnabled();return page;
}
function mic(page:Page){return page.locator('button').filter({has:page.locator('svg.mic-icon')});}
function toast(page:Page){return page.getByRole('status',{name:'Voice confirmation'});}
async function act(page:Page,name:string,arg?:any){await page.evaluate(({name,arg})=>(window as any).voiceUiTest[name](arg),{name,arg});}
async function words(page:Page,text:string,final=true,index=0,time?:number){await page.evaluate(args=>(window as any).voiceUiTest.result(...args),[text,final,index,time]);}
async function snapshot(page:Page){return page.evaluate(()=>(window as any).voiceUiTest.snapshot());}
async function listen(page:Page){await mic(page).click();await act(page,'connect');await browserExpect(mic(page)).toHaveAttribute('aria-pressed','true');}
async function animation(page:Page){return mic(page).locator('svg').evaluate(element=>getComputedStyle(element).animationName);}

test.each(['annotation','marketing','marketing-full'])('%s: mic pulses only while listening and respects reduced motion',async mode=>{
 const page=await setup(mode);expect(await animation(page)).toBe('none');
 await mic(page).click();expect(await animation(page)).toBe('none');await act(page,'connect');
 await browserExpect.poll(()=>animation(page)).not.toBe('none');
 await page.emulateMedia({reducedMotion:'reduce'});expect(await animation(page)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});expect(await animation(page)).not.toBe('none');
 await mic(page).click();expect(await animation(page)).toBe('none');
},20000);

test.each(['annotation','marketing'])('%s: command toast confirms recognised start and stop then clears after about 1.5 seconds',async mode=>{
 const page=await setup(mode);await listen(page);
 await words(page,'start',false,0,1);await browserExpect(toast(page)).toHaveText('Heard: start');expect((await snapshot(page)).paused).toBe(false);
 if(mode==='marketing')await page.screenshot({path:fileURLToPath(new URL('../.np-tools-private/voice-ui-2026-10-30/marketing-component-confirmation.png',import.meta.url))});
 await page.clock.runFor(1400);await browserExpect(toast(page)).toBeVisible();await page.clock.runFor(150);await browserExpect(toast(page)).toHaveCount(0);
 await words(page,'start',true,0,1);await browserExpect(page.getByText(/Didn.t catch that/)).toHaveCount(0);await words(page,'stop',true,1,3);await browserExpect(toast(page)).toHaveText('Heard: stop');expect((await snapshot(page)).paused).toBe(true);
 await page.clock.runFor(1550);await browserExpect(toast(page)).toHaveCount(0);
 expect((await snapshot(page)).attempts).toEqual([]);
},20000);

test('annotation: Saved toast waits for a successful save and failed saving still retries the same clip',async()=>{
 const page=await setup();await listen(page);await act(page,'saveMode','held');
 await words(page,'start',true,0,1);await words(page,'stop',true,1,3);await words(page,'Turn left',true,2);
 await browserExpect.poll(async()=>(await snapshot(page)).attempts.length).toBe(1);expect((await snapshot(page)).annotations).toEqual([]);await browserExpect(toast(page).filter({hasText:'Saved: Turn left'})).toHaveCount(0);
 await act(page,'reject');await browserExpect(page.getByRole('button',{name:/Retry saving 1 voice segment/})).toBeVisible();await browserExpect(toast(page).filter({hasText:'Saved: Turn left'})).toHaveCount(0);
 await act(page,'saveMode','automatic');await page.getByRole('button',{name:/Retry saving 1 voice segment/}).click();await browserExpect(toast(page)).toHaveText('Saved: Turn left');
 expect((await snapshot(page)).annotations).toHaveLength(1);expect((await snapshot(page)).annotations[0]).toMatchObject({label:'Turn left',start_sec:1,end_sec:3});
 await page.clock.runFor(1550);await browserExpect(toast(page)).toHaveCount(0);
},20000);

test('marketing: Saved toast observes the existing queue success rather than calling queued feedback saved',async()=>{
 const page=await setup('marketing');await listen(page);await act(page,'saveMode','held');
 await words(page,'start',true,0,1);await words(page,'stop',true,1,3);await words(page,'Make the logo bigger.',true,2);
 await page.clock.runFor(6010);await browserExpect.poll(async()=>(await snapshot(page)).attempts.length).toBe(1);expect((await snapshot(page)).feedback).toEqual([]);await browserExpect(toast(page).filter({hasText:'Saved:'})).toHaveCount(0);
 await act(page,'resolve');await browserExpect.poll(async()=>(await snapshot(page)).jobs[0].state).toBe('saved');await browserExpect(toast(page)).toContainText('Saved:');await browserExpect(toast(page)).toContainText('Make the logo bigger.');
 await page.clock.runFor(1550);await browserExpect(toast(page)).toHaveCount(0);expect((await snapshot(page)).feedback).toHaveLength(1);
},20000);

test('confirmation remains visible inside an open native editor dialog',async()=>{
 const page=await setup();await listen(page);await act(page,'dialog');await words(page,'start',true,0,1);
 const dialog=page.getByRole('dialog',{name:'Edit annotation',exact:true});
 await browserExpect(dialog.getByRole('status',{name:'Voice confirmation'})).toHaveText('Heard: start');
 await browserExpect(dialog.getByRole('status',{name:'Voice confirmation'})).toBeInViewport();
},20000);

test('a save completing after the voice component unmounts creates no late confirmation timer',async()=>{
 const page=await setup();await listen(page);await act(page,'saveMode','held');
 await words(page,'start',true,0,1);await words(page,'stop',true,1,3);await words(page,'Turn left',true,2);
 await browserExpect.poll(async()=>(await snapshot(page)).attempts.length).toBe(1);
 await act(page,'unmount');await page.evaluate(()=>{const original=window.setTimeout.bind(window);(window as any).lateConfirmationTimers=0;window.setTimeout=((handler:TimerHandler,delay?:number,...args:any[])=>{if(delay===1500)(window as any).lateConfirmationTimers++;return original(handler,delay,...args);}) as typeof window.setTimeout;});
 await act(page,'resolve');await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(1);
 expect(await page.evaluate(()=>(window as any).lateConfirmationTimers)).toBe(0);await browserExpect(toast(page)).toHaveCount(0);
},20000);

test('keyboard: Space, S, E and labels 1–9 work without speech; focused mic keeps its native Space action',async()=>{
 const page=await setup();await page.locator('#neutral').focus();
 await page.keyboard.press('Space');expect((await snapshot(page)).paused).toBe(false);await page.keyboard.press('Space');expect((await snapshot(page)).paused).toBe(true);
 const labels=['Turn left','Turn right','Lift cup','Pour water','Close lid','Fold shirt','Open box','Move sleeve','Put down'];
 for(let index=0;index<labels.length;index++){
  await act(page,'time',index+1);await page.keyboard.press('s');expect((await snapshot(page)).paused).toBe(false);
  await act(page,'time',index+1.5);await page.keyboard.press('e');expect((await snapshot(page)).paused).toBe(true);
  await page.keyboard.press(String(index+1));await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(index+1);
  expect((await snapshot(page)).annotations[index]).toMatchObject({label:labels[index],start_sec:index+1,end_sec:index+1.5});
 }
 expect((await snapshot(page)).recognizers).toBe(0);
 await mic(page).focus();await act(page,'time',20);await page.keyboard.press('s');expect((await snapshot(page)).paused).toBe(false);
 await act(page,'time',21);await page.keyboard.press('e');await page.keyboard.press('1');
 await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(10);
 expect((await snapshot(page)).annotations[9]).toMatchObject({label:'Turn left',start_sec:20,end_sec:21});expect((await snapshot(page)).recognizers).toBe(0);
 const playbackBefore=(await snapshot(page)).events.filter((event:string)=>event==='play'||event==='pause');
 await page.keyboard.press('Space');expect((await snapshot(page)).recognizers).toBe(1);expect((await snapshot(page)).paused).toBe(true);
 expect((await snapshot(page)).events.filter((event:string)=>event==='play'||event==='pause')).toEqual(playbackBefore);
 await browserExpect(page.getByText(/Space.*play.*pause/i)).toBeVisible();await browserExpect(page.getByText(/S.*start.*E.*stop/i)).toBeVisible();
},20000);

test('keyboard: text fields, forms, open editor, modifiers, repeats and inactive workflow do not trigger shortcuts',async()=>{
 const page=await setup();
 for(const name of ['Outside text','Outside notes','Outside choice','Editable text','Custom text field']){
  const field=page.getByLabel(name,{exact:true});await field.focus();for(const key of ['Space','s','e','1'])await page.keyboard.press(key);
 }
 await page.getByRole('button',{name:'Form control',exact:true}).focus();for(const key of ['s','e','1'])await page.keyboard.press(key);
 await page.locator('#neutral').focus();await page.keyboard.press('Control+s');await page.keyboard.press('Alt+s');await page.keyboard.press('Meta+s');
 await page.evaluate(()=>document.getElementById('neutral')!.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',repeat:true,bubbles:true})));
 await page.evaluate(()=>{const target=document.getElementById('neutral')!;target.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',isComposing:true,bubbles:true}));const event=new KeyboardEvent('keydown',{key:'s',code:'KeyS',bubbles:true,cancelable:true});event.preventDefault();target.dispatchEvent(event);});
 await act(page,'dialog');await page.getByRole('button',{name:'Editor control',exact:true}).focus();for(const key of ['s','e','1'])await page.keyboard.press(key);
 await page.getByText('Editor content',{exact:true}).focus();for(const key of ['Space','s','e','1'])await page.keyboard.press(key);
 await page.evaluate(()=>document.querySelector<HTMLDialogElement>('dialog.segment-editor')!.close());await act(page,'active',false);await page.locator('#neutral').focus();for(const key of ['Space','s','e','1'])await page.keyboard.press(key);
 const state=await snapshot(page);expect(state.events).toEqual([]);expect(state.attempts).toEqual([]);expect(state.paused).toBe(true);
},20000);

test('keyboard: number choices use the current label order and cannot save before start and stop',async()=>{
 const page=await setup();await page.locator('#neutral').focus();await page.keyboard.press('1');expect((await snapshot(page)).attempts).toEqual([]);
 await act(page,'labels',['New first','New second']);await act(page,'time',2);await page.keyboard.press('s');await page.keyboard.press('2');expect((await snapshot(page)).attempts).toEqual([]);
 await act(page,'time',4);await page.keyboard.press('e');await page.keyboard.press('9');expect((await snapshot(page)).attempts).toEqual([]);await page.keyboard.press('2');
 await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(1);expect((await snapshot(page)).annotations[0]).toMatchObject({label:'New second',start_sec:2,end_sec:4});
},20000);

test('unrecognised final speech offers the expected command and key, saves nothing, and clears after recognition',async()=>{
 const page=await setup();await listen(page);await words(page,'unrelated words',false,0,1);await browserExpect(page.getByText(/Didn.t catch that/)).toHaveCount(0);
 await words(page,'unrelated words',true,0,1);await browserExpect(page.getByText(/Didn.t catch that/)).toContainText(/start.*S/i);expect((await snapshot(page)).attempts).toEqual([]);
 await words(page,'start',true,1,1);await browserExpect(page.getByText(/Didn.t catch that/)).toHaveCount(0);
 await words(page,'unrelated words',true,2,2);await browserExpect(page.getByText(/Didn.t catch that/)).toContainText(/stop.*E/i);expect((await snapshot(page)).attempts).toEqual([]);expect((await snapshot(page)).paused).toBe(false);
 await words(page,'stop',true,3,3);await browserExpect(page.getByText(/Didn.t catch that/)).toHaveCount(0);expect((await snapshot(page)).paused).toBe(true);
 await words(page,'...',true,4);await browserExpect(page.getByText(/Didn.t catch that/)).toBeVisible();expect((await snapshot(page)).attempts).toEqual([]);
 // Existing open-vocabulary labels remain supported after valid marked bounds.
 await words(page,'Brand new action',true,5);await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(1);expect((await snapshot(page)).annotations[0]).toMatchObject({label:'Brand new action',start_sec:1,end_sec:3});
},20000);
