// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';

// All saved records live only in convex-test. All browser network requests are blocked.
// This exercises real V1 controls and real persistence, never a live workspace or microphone.
const modules=import.meta.glob('../convex/**/*.{ts,js}');
const fixture=fileURLToPath(new URL('./fixtures/v1-voice-protection.tsx',import.meta.url));
let browser:Browser,bundle:string,context:BrowserContext|undefined,pageErrors:string[]=[];
beforeAll(async()=>{
 const result=await build({entryPoints:[fixture],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',plugins:[{name:'isolated-account-and-network',setup(builder){
  builder.onResolve({filter:/^(\.\/workspace|convex\/react)$/},args=>/[/\\]src[/\\]/.test(args.importer)?{path:args.path,namespace:'fixture-hooks'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'fixture-hooks'},()=>({contents:`export {useFixtureWorkspace as useWorkspace,useFixtureQuery as useQuery,useFixtureMutation as useMutation} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
 }}]});
 bundle=result.outputFiles[0].text;
 const downloadsPath=fileURLToPath(new URL('../.np-tools-private/player-checkpoint/downloads',import.meta.url));
 await mkdir(downloadsPath,{recursive:true});
 browser=await chromium.launch({headless:true,channel:'chrome',downloadsPath});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);});
afterAll(async()=>{await browser?.close();});

async function setup(failFirstSave=false){
 const t=convexTest(schema,modules),workspaceToken='f'.repeat(64);
 const data=await t.run(async ctx=>{
  const workspaceId=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Voice trial.mp4',duration:30,frameRate:30});
  return {workspaceId,episodeId};
 });
 let failed=false,saveCalls=0;
 context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.exposeBinding('fixtureBackend',async(_source,kind:string,name:string,args:any)=>{
  if(kind==='mutation'){
   if(name==='annotations:save'){saveCalls++;if(failFirstSave&&!failed){failed=true;throw Error('Isolated request failure before the save reaches the database.');}}
   return t.mutation(makeFunctionReference<'mutation'>(name),args);
  }
  return t.query(makeFunctionReference<'query'>(name),args);
 });
 const config=JSON.stringify({workspaceToken,episodeId:data.episodeId});
 await page.route('**/*',route=>route.request().url()==='https://v1-protection.test/'?route.fulfill({contentType:'text/html',body:`<div id="root"></div><script>window.fixtureConfig=${config}</script><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`}):route.abort());
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.goto('https://v1-protection.test/');
 await browserExpect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();
 const rows=()=>t.query(api.annotations.segments,{workspaceToken,episodeId:data.episodeId});
 return {t,page,workspaceToken,...data,rows,saveCalls:()=>saveCalls};
}
async function words(page:Page,text:string,final:boolean,index:number,time?:number){await page.evaluate(args=>(window as any).v1Fixture.result(...args),[text,final,index,time]);}
async function mark(page:Page,label='Fold "blue", shirt'){
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 await words(page,'start',false,0,1.25);await words(page,'start',true,0,1.6);
 expect(await page.evaluate(()=>(window as any).v1Fixture.snapshot())).toMatchObject({paused:false});
 await words(page,'stop',false,1,3.75);await words(page,'stop',true,1,4.1);
 expect(await page.evaluate(()=>(window as any).v1Fixture.snapshot())).toMatchObject({paused:true});
 await words(page,label,false,2);await words(page,label+'.',true,2);
}

test('V1 voice keeps first command timestamps and saves one final label even when a result is repeated',async()=>{
 const f=await setup();await mark(f.page);await words(f.page,'Fold "blue", shirt.',true,2);
 await browserExpect.poll(f.rows).toHaveLength(1);
 expect((await f.rows())[0]).toMatchObject({label:'Fold "blue", shirt',start_sec:1.25,end_sec:3.75,source:'voice',segmentNumber:1});
 expect(f.saveCalls()).toBe(1);
 await browserExpect(f.page.getByLabel('Saved segment count')).toHaveText('1');
});

test('V1 failed voice save can be retried without speaking again or duplicating the saved segment',async()=>{
 const f=await setup(true);await mark(f.page,'Retry this label');
 await browserExpect(f.page.getByRole('button',{name:'Retry saving 1 voice segment(s)',exact:true})).toBeVisible();
 expect(await f.rows()).toEqual([]);
 await f.page.getByRole('button',{name:'Retry saving 1 voice segment(s)',exact:true}).click();
 await browserExpect.poll(f.rows).toHaveLength(1);
 await browserExpect(f.page.getByRole('button',{name:/Retry saving/})).toHaveCount(0);
 expect((await f.rows())[0]).toMatchObject({label:'Retry this label',start_sec:1.25,end_sec:3.75,source:'voice'});
 expect(f.saveCalls()).toBe(2);
});

test('V1 saved voice segments reopen from persisted data with their label and exact times',async()=>{
 const f=await setup();await mark(f.page,'Reopen this clip');await browserExpect.poll(f.rows).toHaveLength(1);
 const before=await f.rows();await f.page.reload();
 await browserExpect(f.page.getByLabel('Saved segment count')).toHaveText('1');
 await browserExpect(f.page.getByRole('heading',{name:'Reopen this clip'})).toBeVisible();
 expect(await f.rows()).toEqual(before);
 await browserExpect(f.page.getByRole('button',{name:'Turn mic on',exact:true})).toBeVisible();
});

test('V1 review disqualification is saved and Undo last decision restores export eligibility',async()=>{
 const f=await setup();await mark(f.page,'Keep this clip');await browserExpect.poll(f.rows).toHaveLength(1);
 await f.page.getByRole('button',{name:'Disqualify',exact:true}).click();
 await browserExpect.poll(async()=>(await f.rows())[0].reviewStatus).toBe('disqualified');
 expect(await f.t.query(api.annotations.exportAll,{workspaceToken:f.workspaceToken})).toEqual([]);
 await f.page.getByRole('button',{name:'Undo last decision',exact:true}).click();
 await browserExpect.poll(async()=>(await f.rows())[0].reviewStatus).toBe('pending');
 expect(await f.t.query(api.annotations.exportAll,{workspaceToken:f.workspaceToken})).toEqual([{episode:'Voice trial.mp4',label:'Keep this clip',start_sec:1.25,end_sec:3.75}]);
 await f.page.getByRole('button',{name:'Verify',exact:true}).click();
 await browserExpect.poll(async()=>(await f.rows())[0].reviewStatus).toBe('verified');
});

test('V1 trial player Undo and Redo preserve the original saved segment identity and values',async()=>{
 const f=await setup();await mark(f.page,'Undo this clip');await browserExpect.poll(f.rows).toHaveLength(1);
 const before=(await f.rows())[0];
 await browserExpect(f.page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
 await f.page.getByRole('button',{name:'Undo',exact:true}).click();await browserExpect.poll(f.rows).toEqual([]);
 expect(await f.t.run(ctx=>ctx.db.get(before._id))).toMatchObject({historyHidden:true,label:before.label});
 await f.page.getByRole('button',{name:'Redo',exact:true}).click();await browserExpect.poll(f.rows).toHaveLength(1);
 expect((await f.rows())[0]).toMatchObject({_id:before._id,label:before.label,start_sec:1.25,end_sec:3.75,source:'voice',segmentNumber:1});
});

test('V1 real episode CSV download preserves quoted labels, timestamps, frames and voice source',async()=>{
 const f=await setup();await mark(f.page);await browserExpect.poll(f.rows).toHaveLength(1);
 const downloadPromise=f.page.waitForEvent('download');await f.page.getByRole('button',{name:'Export episode CSV',exact:true}).click();
 const download=await downloadPromise;expect(await download.failure()).toBeNull();
 const stream=await download.createReadStream();let text='';for await(const chunk of stream!)text+=chunk.toString();
 expect(download.suggestedFilename()).toBe('episode-segments.csv');
 expect(text).toBe('episode,annotation_id,label,start_sec,end_sec,duration_sec,start_frame,end_frame,source\r\n"Voice trial.mp4","ANN_001","Fold ""blue"", shirt",1.25,3.75,2.5,"38","113","voice"');
 expect(await f.rows()).toHaveLength(1);
});

test('V1 export data keeps voice labels and excludes disqualified, image and V2 records without deleting them',async()=>{
 const f=await setup();await mark(f.page,'Export this clip');await browserExpect.poll(f.rows).toHaveLength(1);
 const excluded=await f.t.run(async ctx=>{
  const image=await ctx.db.insert('episodes',{workspaceId:f.workspaceId,name:'Existing image',duration:0,mediaType:'image'});
  const v2=await ctx.db.insert('episodes',{workspaceId:f.workspaceId,name:'Existing V2',duration:30});
  await ctx.db.insert('v2Videos',{workspaceId:f.workspaceId,episodeId:v2,sample:false});
  const disqualified=await ctx.db.insert('segments',{episodeId:f.episodeId,label:'Rejected clip',start_sec:5,end_sec:6,reviewStatus:'disqualified'});
  const imageLabel=await ctx.db.insert('imageLabels',{episodeId:image,label:'Existing label',normalizedLabel:'existing label',clientKey:'old-image',source:'voice',reviewStatus:'pending'});
  const v2Segment=await ctx.db.insert('segments',{episodeId:v2,label:'V2 clip',start_sec:7,end_sec:8});
  return {image,v2,disqualified,imageLabel,v2Segment};
 });
 const rows=await f.t.query(api.annotations.exportAll,{workspaceToken:f.workspaceToken});
 // main.tsx uses this exact query result for its JSON download; the full-page download button is not mounted here.
 expect(JSON.parse(JSON.stringify(rows,null,2))).toEqual([{episode:'Voice trial.mp4',label:'Export this clip',start_sec:1.25,end_sec:3.75}]);
 const visible=await f.t.query(api.annotations.episodes,{workspaceToken:f.workspaceToken});
 expect(visible.map(ep=>ep._id)).not.toContain(excluded.v2);
 for(const id of Object.values(excluded))expect(await f.t.run(ctx=>ctx.db.get(id))).not.toBeNull();
});
