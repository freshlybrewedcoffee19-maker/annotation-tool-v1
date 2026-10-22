// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Real Chrome and real marketing persistence through SampleProvider; controlled speech/playback.
// All requests are intercepted. No dev server, microphone, account or live data is used.
let browser:Browser,bundle:string,context:BrowserContext|undefined;
let pageErrors:string[]=[];
const fixture=fileURLToPath(new URL('./fixtures/product-tracking-voice.tsx',import.meta.url));
beforeAll(async()=>{
 const built=await build({entryPoints:[fixture],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',plugins:[{name:'annotation-account-boundary',setup(builder){
  builder.onResolve({filter:/^(\.\/workspace|convex\/react)$/},args=>/[/\\](VoiceLabels\.tsx|useImageLabels\.ts)$/.test(args.importer)?{path:args.path,namespace:'annotation-boundary'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'annotation-boundary'},()=>({contents:`export {useAnnotationWorkspace as useWorkspace,useAnnotationQuery as useQuery,useAnnotationMutation as useMutation} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
 }}]});
 bundle=built.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);});
afterAll(async()=>{await browser?.close();});
async function setup(sink='success',mode:'marketing'|'annotation'|'image'='marketing'){
 context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130'});
 const page=await context.newPage();
 pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.route('**/*',route=>route.request().url()==='https://voice.test/'?route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`}):route.abort());
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.goto(`https://voice.test/${mode==='marketing'?'':`#${mode}`}`);
 await browserExpect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 await action(page,'setSink',sink);
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 // The failing or never-settling tracking request is already active before voice commands.
 await page.clock.runFor(1);
 await action(page,'connect');
 if(mode==='image')return page;
 await words(page,'start',true,0,1);
 expect((await snapshot(page)).paused).toBe(false);
 await words(page,'stop',true,1,3);
 expect((await snapshot(page)).paused).toBe(true);
 return page;
}
async function action(page:Page,name:string,arg?:string){await page.evaluate(({name,arg})=>(window as any).voiceTest[name](arg),{name,arg});}
async function words(page:Page,text:string,final:boolean,index=2,time?:number){await page.evaluate(args=>(window as any).voiceTest.result(...args),[text,final,index,time]);}
async function snapshot(page:Page){return page.evaluate(()=>(window as any).voiceTest.snapshot());}
async function savedFeedback(page:Page,text:string){
 await browserExpect.poll(async()=>(await snapshot(page)).feedback.length).toBe(1);
 await browserExpect.poll(async()=>(await snapshot(page)).jobs.map((job:any)=>job.state)).toEqual(['saved']);
 const state=await snapshot(page);
 expect(state.feedback[0]).toMatchObject({start:1,end:3,text});
 return state;
}
function events(state:any,name:string){return state.tracked.filter((event:any)=>event.name===name);}

test('voice feedback autosaves once and natural speech restart does not count another recording attempt',async()=>{
 const page=await setup();
 await words(page,'Make the logo bigger.',true);
 await page.clock.runFor(6000);
 await savedFeedback(page,'Make the logo bigger.');
 await action(page,'end');await page.clock.runFor(250);await action(page,'connect');await page.clock.runFor(10);
 const state=await snapshot(page);
 expect(state.recognizers).toBe(2);
 expect(events(state,'recording_attempt')).toHaveLength(1);
 expect(events(state,'save_succeeded')).toHaveLength(1);
 expect(events(state,'recording_attempt')[0]).toMatchObject({workflow:'marketing',sample:true});
 expect(events(state,'save_succeeded')[0]).toMatchObject({workflow:'marketing',sample:true});
 expect(state.tracked).toHaveLength(2);
});

test.each(['reject','throw','pending'])('tracking %s never delays the real feedback autosave or the completed-note mic-stop save',async sink=>{
 const page=await setup(sink);
 await words(page,'Shorten the opening.',true);await page.clock.runFor(6010);
 await savedFeedback(page,'Shorten the opening.');
 // A second complete note is stopped before Android's six-second autosave deadline (P1).
 await words(page,'start',true,3,5);await words(page,'stop',true,4,7);await words(page,'Keep this frame.',true,5);
 await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
 await browserExpect.poll(async()=>(await snapshot(page)).feedback.length).toBe(2);
 await browserExpect.poll(async()=>(await snapshot(page)).jobs.map((job:any)=>job.state)).toEqual(['saved','saved']);
 await action(page,'stop');await page.clock.runFor(10);
 const state=await snapshot(page);
 expect(state.feedback.map((row:any)=>({start:row.start,end:row.end,text:row.text}))).toEqual([{start:1,end:3,text:'Shorten the opening.'},{start:5,end:7,text:'Keep this frame.'}]);
 expect(events(state,'recording_attempt')).toHaveLength(1);
 expect(events(state,'save_succeeded')).toHaveLength(2);
 expect(state.speechEvents.at(-1)).toBe('abort');
});

test('editing already-saved feedback keeps one saved row and does not count a new save',async()=>{
 const page=await setup();await words(page,'Original feedback.',true);await page.clock.runFor(6010);
 const before=await savedFeedback(page,'Original feedback.');
 await page.getByRole('button',{name:'Edit saved feedback',exact:true}).click();
 await browserExpect.poll(async()=>(await snapshot(page)).feedback[0].text).toBe('Edited saved feedback');
 await page.clock.runFor(10);const state=await snapshot(page);
 expect(state.feedback).toHaveLength(1);expect(state.feedback[0].id).toBe(before.feedback[0].id);
 expect(events(state,'save_succeeded')).toHaveLength(1);
});

test.each(['reject','throw','pending'])('annotation voice still saves exact label and marked times when tracking %s',async sink=>{
 const page=await setup(sink,'annotation');await words(page,'Turn left.',true);await page.clock.runFor(10);
 await browserExpect.poll(async()=>(await snapshot(page)).annotations.length).toBe(1);
 const state=await snapshot(page);
 expect(state.annotations[0]).toMatchObject({label:'Turn left',start_sec:1,end_sec:3,source:'voice',workspaceToken:'isolated-workspace',episodeId:'isolated-episode'});
 await browserExpect(page.getByRole('status')).toHaveCount(0);
 await action(page,'end');await action(page,'connect');await page.clock.runFor(1);
 const restarted=await snapshot(page);
 expect(events(restarted,'recording_attempt')).toHaveLength(1);
 expect(events(state,'recording_attempt')).toHaveLength(1);
 expect(events(state,'save_succeeded')).toHaveLength(1);
 expect(events(state,'save_succeeded')[0]).toMatchObject({workflow:'annotation'});
});

test('image voice saves its label when tracking fails and a speech restart counts no extra mic attempt',async()=>{
 const page=await setup('reject','image');
 await words(page,'Red bicycle.',true,0);await page.clock.runFor(10);
 await browserExpect.poll(async()=>(await snapshot(page)).imageLabels.length).toBe(1);
 await browserExpect(page.getByRole('status')).toHaveCount(0);
 await browserExpect(page.getByRole('alert')).toHaveCount(0);
 await browserExpect.poll(async()=>(await snapshot(page)).imageRecovery).toEqual([]);
 await action(page,'end');await action(page,'connect');await page.clock.runFor(1);
 const state=await snapshot(page);
 expect(state.imageLabels[0]).toMatchObject({workspaceToken:'isolated-workspace',episodeId:'isolated-image',label:'Red bicycle',source:'voice'});
 expect(state.speechEvents.filter((event:string)=>event==='start')).toHaveLength(2);
 expect(events(state,'recording_attempt')).toHaveLength(1);
 expect(events(state,'save_succeeded')).toHaveLength(1);
 expect(events(state,'save_succeeded')[0]).toMatchObject({workflow:'annotation',episodeId:'isolated-image',imageLabelId:state.imageLabels[0].id});
});
