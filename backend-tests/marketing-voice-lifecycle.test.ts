// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// No server, real microphone, signed-in account, or external network is used.
let browser:Browser,bundle:string,context:BrowserContext|undefined;
const fixture=fileURLToPath(new URL('./fixtures/marketing-voice-lifecycle.tsx',import.meta.url));
beforeAll(async()=>{
 const built=await build({entryPoints:[fixture],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',plugins:[{name:'isolated-account-and-queue',setup(builder){
  builder.onResolve({filter:/^\.\/(hooks|use-feedback-queue)$/},args=>args.importer.endsWith('FeedbackComposer.tsx')?{path:args.path,namespace:'isolated'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'isolated'},()=>({contents:`export {useQuery,useSample,useFeedbackQueue} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
 }}]});
 bundle=built.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;});
afterAll(async()=>{await browser?.close();});
async function setup(apple=false){
 context=await browser.newContext({userAgent:apple?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)':'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130'});
 const page=await context.newPage();
 await page.route('**/*',route=>route.request().url()==='https://voice.test/'?route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`}):route.abort());
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.goto('https://voice.test/');
 await browserExpect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 await action(page,'connect');
 await words(page,'start',true,0,1);
 await words(page,'stop',true,1,3);
 return page;
}
async function action(page:Page,name:string,arg?:string){await page.evaluate(({name,arg})=>(window as any).voiceTest[name](arg),{name,arg});}
async function words(page:Page,text:string,final:boolean,index=2,time?:number){await page.evaluate(args=>(window as any).voiceTest.result(...args),[text,final,index,time]);}
async function snapshot(page:Page){return page.evaluate(()=>(window as any).voiceTest.snapshot());}
async function draft(page:Page){return page.evaluate(()=>(window as any).voiceTest.draft());}
async function onlySaved(page:Page,text:string){
 await browserExpect.poll(async()=>(await snapshot(page)).saved.length).toBe(1);
 const state=await snapshot(page);expect(state.jobs).toHaveLength(1);expect(state.saved[0]).toMatchObject({start:'1.000',end:'3.000',text});
}

test('P1: mic tap queues completed feedback before closing, exactly once',async()=>{
 const page=await setup();await words(page,'Make the logo bigger.',true);
 await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
 expect((await snapshot(page)).events.slice(-2)).toEqual(['enqueue','abort']);
 await action(page,'stop');await page.clock.runFor(5000);await onlySaved(page,'Make the logo bigger.');
});
test('P1: screen lock or app switch saves a completed note before closing',async()=>{
 const page=await setup();await words(page,'Shorten the opening.',true);await action(page,'hide');
 expect((await snapshot(page)).events.slice(-2)).toEqual(['enqueue','abort']);
 await action(page,'hide');await action(page,'stop');await onlySaved(page,'Shorten the opening.');
});
test('P1: fatal recognition error queues a final note without waiting for its timer',async()=>{
 const page=await setup();await words(page,'Use the blue title.',true);await action(page,'error','audio-capture');
 expect((await snapshot(page)).jobs).toHaveLength(1);
 await action(page,'stop');await page.clock.runFor(5000);await onlySaved(page,'Use the blue title.');
});
test('P1: leaving the component queues completed feedback once',async()=>{
 const page=await setup();await words(page,'Remove this shot.',true);await action(page,'unmount');
 expect((await snapshot(page)).events.slice(-2)).toEqual(['enqueue','abort']);
 await page.clock.runFor(5000);await onlySaved(page,'Remove this shot.');
});
test.each(['stop','hide','error'])('P1: %s keeps unfinished speech as an interrupted local draft',async reason=>{
 const page=await setup();await words(page,'Make the logo',false);
 await action(page,reason,reason==='error'?'audio-capture':undefined);await page.clock.runFor(5000);
 expect((await snapshot(page)).jobs).toHaveLength(0);
 expect(await draft(page)).toMatchObject({start:'1.000',end:'3.000',text:'Make the logo',interrupted:true});
});
test.each([false,true])('P2: natural restart settles partial feedback without more speech (iPhone=%s)',async apple=>{
 const page=await setup(apple);await words(page,'Move the title up',false);await action(page,'end');
 await page.clock.runFor(250);await action(page,'connect');await page.clock.runFor(1499);
 expect((await snapshot(page)).jobs).toHaveLength(0);
 await page.clock.runFor(1);expect((await snapshot(page)).jobs).toHaveLength(1);
 await action(page,'stop');await onlySaved(page,'Move the title up');
});
test('P2: fresh speech cancels the restarted settle timer and speech end re-arms it',async()=>{
 const page=await setup();await words(page,'Change this title',false);await action(page,'error','network');
 await page.clock.runFor(300);await action(page,'connect');await page.clock.runFor(1000);
 await action(page,'speechStart');await page.clock.runFor(1000);expect((await snapshot(page)).jobs).toHaveLength(0);
 await action(page,'speechEnd');await page.clock.runFor(1499);expect((await snapshot(page)).jobs).toHaveLength(0);
 await page.clock.runFor(1);expect((await snapshot(page)).jobs).toHaveLength(1);await onlySaved(page,'Change this title');
});
test('P2: pending feedback cannot save while reconnecting or after a fatal retry failure',async()=>{
 const page=await setup();await words(page,'Make the ending',false);await action(page,'error','network');
 await page.clock.runFor(300);await page.clock.runFor(2000);expect((await snapshot(page)).jobs).toHaveLength(0);
 await action(page,'error','network');await page.clock.runFor(600);await action(page,'error','network');
 await page.clock.runFor(5000);expect((await snapshot(page)).jobs).toHaveLength(0);
 expect(await draft(page)).toMatchObject({text:'Make the ending',interrupted:true});
});
test('P2: new final speech joins the recovered text and saves only one complete note',async()=>{
 const page=await setup();await words(page,'Make the title',false);await action(page,'end');
 await page.clock.runFor(250);await action(page,'connect');await page.clock.runFor(1000);
 await words(page,'bigger and blue.',true,0);await page.clock.runFor(1499);expect((await snapshot(page)).jobs).toHaveLength(0);
 await page.clock.runFor(1);await onlySaved(page,'Make the title bigger and blue.');
 await action(page,'stop');await action(page,'unmount');expect((await snapshot(page)).jobs).toHaveLength(1);
});
test('P1/P2 guard: stopping after an ordinary automatic save never saves it twice',async()=>{
 const page=await setup();await words(page,'Keep this frame.',true);await page.clock.runFor(1500);
 await onlySaved(page,'Keep this frame.');await action(page,'stop');await action(page,'hide');await action(page,'unmount');
 expect((await snapshot(page)).jobs).toHaveLength(1);
});
test('P1 guard: a completed sentence plus unfinished words stays together as a draft',async()=>{
 const page=await setup();await words(page,'Use blue.',true);await words(page,'And make the',false,3);
 await action(page,'stop');await page.clock.runFor(5000);expect((await snapshot(page)).jobs).toHaveLength(0);
 expect(await draft(page)).toMatchObject({text:'Use blue. And make the',interrupted:true});
});
test('P1 guard: stopping while manually editing keeps the draft instead of auto-saving',async()=>{
 const page=await setup();await words(page,'Keep this.',true);
 await page.getByRole('button',{name:'Edit draft',exact:true}).click();
 await page.getByLabel('Feedback transcript',{exact:true}).fill('Manual draft');
 await action(page,'stop');
 // Manual editing is not a completed spoken note.
 expect((await snapshot(page)).jobs).toHaveLength(0);
 expect(await draft(page)).toMatchObject({text:'Manual draft'});
});
test('P1 guard: explicit manual saving still queues one note and closes the mic',async()=>{
 const page=await setup();await words(page,'Make the title',false);
 await page.getByRole('button',{name:'Edit draft',exact:true}).click();
 await page.getByLabel('Feedback transcript',{exact:true}).fill('Make the title');
 await page.getByRole('button',{name:'Save feedback',exact:true}).click();
 await action(page,'stop');expect((await snapshot(page)).jobs).toHaveLength(1);
});
