// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// No dev server or live backend. Every browser request is intercepted.
let browser:Browser,bundle:string,context:BrowserContext|undefined;
let pageErrors:string[]=[];
const fixture=fileURLToPath(new URL('./fixtures/product-tracking-clips.tsx',import.meta.url));
beforeAll(async()=>{
 const built=await build({entryPoints:[fixture],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({MODE:'test',VITE_CONVEX_SITE_URL:'https://media.test'})},plugins:[{name:'isolated-card-view',setup(builder){
  builder.onLoad({filter:/[/\\]MarketingApp\.tsx$/},async args=>({contents:(await readFile(args.path,'utf8'))+'\nexport {CardView as IsolatedCardView};',loader:'tsx',resolveDir:dirname(args.path)}));
  builder.onResolve({filter:/^\.\/hooks$/},args=>args.importer.endsWith('MarketingApp.tsx')?{path:args.path,namespace:'isolated-account'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'isolated-account'},()=>({contents:`export {useAction,useMutation,useQuery,useSample,SampleProvider,createSample} from ${JSON.stringify(fixture)};`,resolveDir:dirname(fixture)}));
 }}]});
 bundle=built.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);});
afterAll(async()=>{await browser?.close();});

async function setup(){
 context=await browser.newContext();const page=await context.newPage();
 pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.route('**/*',route=>route.request().url()==='https://clips.test/'?route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`}):route.abort());
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.goto('https://clips.test/');
 await browserExpect(page.getByRole('button',{name:'Play feedback 1: Shorten the intro',exact:true})).toBeEnabled();
 await action(page,'ready');
 return page;
}
async function action(page:Page,name:string,arg?:unknown){await page.evaluate(({name,arg})=>(window as any).clipTest[name](arg),{name,arg});}
async function snapshot(page:Page){return page.evaluate(()=>(window as any).clipTest.snapshot());}

test('a clip click sends no event until the real video emits playing, then repeated playing emits one event',async()=>{
 const page=await setup();
 await page.getByRole('button',{name:'Play feedback 1: Shorten the intro',exact:true}).click();
 await page.clock.runFor(1);
 let state=await snapshot(page);
 expect(state.media).toMatchObject({time:1,plays:1});
 expect(state.tracked).toEqual([]);
 await action(page,'playing',3);await page.clock.runFor(1);
 state=await snapshot(page);
 expect(state.tracked).toHaveLength(1);
 expect(state.tracked[0]).toMatchObject({workflow:'marketing',name:'clip_play',traffic:'test',cardId:'clip-card',versionId:'version-2',feedbackId:'feedback-2',reviewToken:'isolated-review-token'});
 await action(page,'playing',2);await page.clock.runFor(1);
 expect((await snapshot(page)).tracked).toHaveLength(1);
});

test('a rejected clip play sends no event, including an unrelated later playing event',async()=>{
 const page=await setup();await action(page,'blocked',true);
 await page.getByRole('button',{name:'Play feedback 1: Shorten the intro',exact:true}).click();
 await browserExpect(page.getByRole('alert')).toContainText('Isolated playback blocked');
 await page.clock.runFor(1);
 expect((await snapshot(page)).tracked).toEqual([]);
 await action(page,'playing');await page.clock.runFor(1);
 expect((await snapshot(page)).tracked).toEqual([]);
});

test('selecting feedback from another version attaches tracking to the new video and ignores the old video',async()=>{
 const page=await setup();
 const firstId=(await snapshot(page)).media.id;
 await action(page,'remember');
 await page.getByRole('button',{name:'Play feedback 2: Move the title',exact:true}).click();
 await browserExpect.poll(async()=>(await snapshot(page)).media.id).not.toBe(firstId);
 await action(page,'ready');await page.clock.runFor(1);
 let state=await snapshot(page);
 expect(state.media).toMatchObject({time:5,plays:1});
 expect(state.media.source).toContain('asset=version-1');
 expect(state.tracked).toEqual([]);
 await action(page,'oldPlaying');await page.clock.runFor(1);
 expect((await snapshot(page)).tracked).toEqual([]);
 await action(page,'playing',3);await page.clock.runFor(1);
 state=await snapshot(page);
 expect(state.tracked).toHaveLength(1);
 expect(state.tracked[0]).toMatchObject({name:'clip_play',versionId:'version-1',feedbackId:'feedback-1'});
});
