// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const boundary=fileURLToPath(new URL('./fixtures/v1-segment-editing-boundary.tsx',import.meta.url));
const main=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
const screenshots=fileURLToPath(new URL('../.np-tools-private/segment-editing/',import.meta.url));
const unusedPages:Record<string,string>={'./ImageWorkspace':'ImageWorkspace','./marketing/MarketingApp':'MarketingApp','./v2/Workspace':'VersionTwo','./ObjectBoxes':'ObjectBoxes','./Landing':'Landing','./Services':'Services','./SignIn':'SignIn','./ProjectWorkspace':'ProjectWorkspace','./ProjectCollaborators':'JoinProject'};
let browser:Browser,context:BrowserContext|undefined,bundle:string,styles:string,media:Buffer;
let pageErrors:string[]=[],unexpectedRequests:string[]=[];
beforeAll(async()=>{
 const result=await build({entryPoints:[main],bundle:true,write:false,outdir:'isolated-editing-output',format:'esm',platform:'browser',jsx:'automatic',define:{'import.meta.env.VITE_CONVEX_URL':'"https://unused.test"','import.meta.env.VITE_TRIAL_VIDEO_PATH':'undefined'},plugins:[{name:'main-editing-isolation',setup(builder){
  builder.onResolve({filter:/^(convex\/react|@convex-dev\/auth\/react|\.\/workspace)$/},()=>({path:boundary}));
  builder.onResolve({filter:/^\.\//},args=>args.importer===main&&unusedPages[args.path]?{path:unusedPages[args.path],namespace:'unmounted-page'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'unmounted-page'},args=>({contents:`export function ${args.path}(){throw Error('Unexpected unrelated route: ${args.path}');}`}));
 }}]});
 bundle=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;
 styles=result.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 media=await readFile(fileURLToPath(new URL('../public/videos/iron-e05a44b0.mp4',import.meta.url)));
 await mkdir(screenshots,{recursive:true});
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);expect(unexpectedRequests).toEqual([]);});
afterAll(async()=>{await browser?.close();});

async function setup(kind:'trial'|'personal'='trial',width=1440,failFirstSave=false,step='export'){
 const t=convexTest(schema,modules),workspaceToken='e'.repeat(64);
 const ids=await t.run(async ctx=>{
  const userId=kind==='personal'?await ctx.db.insert('users',{name:'Isolated editor',email:'isolated-editor@example.test'}):undefined;
  const workspaceId=await ctx.db.insert('workspaces',{token:workspaceToken,kind,...(userId?{userId}:{})});
  const storageId=await ctx.storage.store(new Blob([new Uint8Array(media)],{type:'video/mp4'}));
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Editing example.mp4',duration:30,frameRate:30,width:1280,height:720,storageId});
  const edited=await ctx.db.insert('segments',{episodeId,label:'Fold shirt',start_sec:1,end_sec:3,source:'voice',segmentNumber:1,reviewStatus:'verified'});
  const sameLabel=await ctx.db.insert('segments',{episodeId,label:'Fold shirt',start_sec:8,end_sec:10,source:'voice',segmentNumber:2,reviewStatus:'verified'});
  const otherEpisode=await ctx.db.insert('episodes',{workspaceId,name:'Untouched video.mp4',duration:20});
  const untouched=await ctx.db.insert('segments',{episodeId:otherEpisode,label:'Untouched note',start_sec:2,end_sec:5,source:'voice'});
  const oldImage=await ctx.db.insert('episodes',{workspaceId,name:'Retained image.png',duration:0,mediaType:'image'});
  const imageLabel=await ctx.db.insert('imageLabels',{episodeId:oldImage,label:'Keep image work',normalizedLabel:'keep image work',clientKey:'retained-image-label',source:'voice',reviewStatus:'pending'});
  const storageUrl=await ctx.storage.getUrl(storageId);
  return {userId,workspaceId,episodeId,edited,sameLabel,untouched,imageLabel,storageUrl};
 });
 const backend=ids.userId?t.withIdentity({subject:ids.userId}):t;
 const read=()=>t.run(async ctx=>({edited:await ctx.db.get(ids.edited),sameLabel:await ctx.db.get(ids.sameLabel),untouched:await ctx.db.get(ids.untouched),imageLabel:await ctx.db.get(ids.imageLabel)}));
 const before=await read(),calls:{kind:string;name:string;args:any}[]=[];let failureUsed=false;
 context=await browser.newContext({viewport:{width,height:width<600?844:900},acceptDownloads:true});
 const page=await context.newPage();pageErrors=[];unexpectedRequests=[];
 page.setDefaultTimeout(3000);
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.exposeBinding('fixtureBackend',async(_source,operation:string,name:string,args:any)=>{
  calls.push({kind:operation,name,args});
  if(operation==='mutation'){
   if(name==='annotations:save'&&failFirstSave&&!failureUsed){failureUsed=true;throw Error('Isolated save failure. Your changes are still here.');}
   if(!['annotations:save','annotations:review','sessions:save','collaboration:heartbeat','collaboration:release','trialHistory:apply','productEvents:record'].includes(name))throw Error('Unexpected mutation: '+name);
   return backend.mutation(makeFunctionReference<'mutation'>(name),args);
  }
  if(operation!=='query')throw Error('Unexpected operation: '+operation);
  return backend.query(makeFunctionReference<'query'>(name),args);
 });
 const initial={'np-workspace-token':workspaceToken,[`np-episode-${workspaceToken}`]:ids.episodeId,[`np-step-${workspaceToken}`]:step,[`cv-activity-${workspaceToken}`]:step==='export'?'review':'actions'};
 const url='https://v1-editing.test/annotate';
 await page.route('**/*',route=>{
  const request=route.request().url();
  if(request===url)return route.fulfill({contentType:'text/html',body:`<style>${styles}</style><div id="root"></div><script>window.fixtureConfig=${JSON.stringify({workspaceToken,kind})};Object.entries(${JSON.stringify(initial)}).forEach(([key,value])=>localStorage.setItem(key,value));sessionStorage.setItem('cv-headphones-annotation','dismissed');</script><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`});
  if(request===ids.storageUrl){
   const range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
   const headers={'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'};
   if(range){const from=Number(range[1]),to=range[2]?Math.min(Number(range[2]),media.length-1):media.length-1;return route.fulfill({status:206,contentType:'video/mp4',headers:{...headers,'Content-Range':`bytes ${from}-${to}/${media.length}`},body:media.subarray(from,to+1)});}
   return route.fulfill({contentType:'video/mp4',headers,body:media});
  }
  if(request==='https://v1-editing.test/images/trial-0.png')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'});
  unexpectedRequests.push(request);return route.abort();
 });
 await page.routeWebSocket('**/*',socket=>{unexpectedRequests.push(socket.url());socket.close();});
 await page.goto(url);
 await browserExpect(page.locator(step==='export'?'#panel-export video':'#panel-annotate video')).toBeVisible();
 await browserExpect.poll(()=>page.locator('#panel-annotate video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThanOrEqual(2);
 return {page,backend,t,workspaceToken,...ids,before,read,calls};
}

test.each(['trial','personal'] as const)('%s: Review > Edit annotation exposes editable start, end and label fields',async kind=>{
 const f=await setup(kind);
 await f.page.getByRole('button',{name:'Edit annotation',exact:true}).click();
 await browserExpect(f.page.getByRole('spinbutton',{name:'Start (seconds)',exact:true})).toBeVisible({timeout:1500});
 await browserExpect(f.page.getByRole('spinbutton',{name:'End (seconds)',exact:true})).toBeVisible();
 await browserExpect(f.page.getByLabel('Label',{exact:true})).toBeVisible();
 if(kind==='trial'){
  await browserExpect.poll(()=>f.page.getByRole('dialog',{name:'Edit annotation',exact:true}).locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThanOrEqual(2);
  await f.page.screenshot({path:screenshots+'trial-review-edit-desktop.png'});
 }
 expect(await f.read()).toEqual(f.before);
},20000);

async function editFromReview(page:Page){
 await page.getByRole('button',{name:'Edit annotation',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Edit annotation',exact:true});
 await browserExpect(dialog).toBeVisible();return dialog;
}

test.each(['trial','personal'] as const)('%s: correcting a segment keeps its ID and voice source, resets review, and leaves other work unchanged',async kind=>{
 const f=await setup(kind),dialog=await editFromReview(f.page);
 await dialog.getByLabel('Start (seconds)',{exact:true}).fill('1.25');
 await dialog.getByLabel('End (seconds)',{exact:true}).fill('3.75');
 await dialog.getByLabel('Label',{exact:true}).fill('Fold blue shirt');
 await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
 await browserExpect(dialog).toHaveCount(0);
 const saved=await f.read();
 expect(saved.edited).toMatchObject({_id:f.edited,_creationTime:f.before.edited!._creationTime,label:'Fold blue shirt',start_sec:1.25,end_sec:3.75,source:'voice',segmentNumber:1,reviewStatus:'pending'});
 expect(saved.sameLabel).toEqual(f.before.sameLabel);expect(saved.untouched).toEqual(f.before.untouched);expect(saved.imageLabel).toEqual(f.before.imageLabel);
 expect(f.calls.filter(call=>call.name==='annotations:save')).toHaveLength(1);
 expect(f.calls.some(call=>call.name==='labels:save')).toBe(false);
 expect((await f.backend.query(api.annotations.segments,{workspaceToken:f.workspaceToken,episodeId:f.episodeId})).map(row=>row._id).sort()).toEqual([f.edited,f.sameLabel].sort());
 await f.page.reload();
 if(kind==='personal'){
  await browserExpect(f.page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');
  await f.page.getByRole('tab',{name:'Export',exact:true}).click();
 }
 const reopened=await editFromReview(f.page);
 await browserExpect(reopened.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1.25');
 await browserExpect(reopened.getByLabel('End (seconds)',{exact:true})).toHaveValue('3.75');
 await browserExpect(reopened.getByLabel('Label',{exact:true})).toHaveValue('Fold blue shirt');
 await reopened.getByRole('button',{name:'Cancel edit',exact:true}).click();
 expect((await f.backend.query(api.annotations.exportAll,{workspaceToken:f.workspaceToken})).find(row=>row.label==='Fold blue shirt')).toMatchObject({start_sec:1.25,end_sec:3.75});
},20000);

test('cancel discards an unsaved correction without changing the original segment or review decision',async()=>{
 const f=await setup(),dialog=await editFromReview(f.page);
 await dialog.getByLabel('Label',{exact:true}).fill('Unsaved correction');
 await dialog.getByLabel('Start (seconds)',{exact:true}).fill('2');
 await dialog.getByRole('button',{name:'Cancel edit',exact:true}).click();
 await browserExpect(f.page.getByRole('button',{name:'Edit annotation',exact:true})).toBeFocused();
 expect(await f.read()).toEqual(f.before);
 const reopened=await editFromReview(f.page);
 await browserExpect(reopened.getByLabel('Label',{exact:true})).toHaveValue('Fold shirt');
 await browserExpect(reopened.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1');
 expect(f.calls.filter(call=>call.name==='annotations:save')).toHaveLength(0);
},20000);

test('a review voice command cannot replace an already open correction and discard its unfinished draft',async()=>{
 const f=await setup(),dialog=await editFromReview(f.page);
 await dialog.getByLabel('Label',{exact:true}).fill('Keep this unfinished correction');
 await dialog.getByLabel('Start (seconds)',{exact:true}).fill('1.25');
 await f.page.evaluate(episodeId=>window.dispatchEvent(new CustomEvent('cv-review-command',{detail:{episodeId,command:'next clip'}})),f.episodeId);
 await browserExpect(f.page.locator('#panel-export .review-card-top>span:first-child')).toHaveText('Segment 2 of 2');
 await f.page.evaluate(episodeId=>window.dispatchEvent(new CustomEvent('cv-review-command',{detail:{episodeId,command:'edit annotation'}})),f.episodeId);
 await browserExpect(dialog.getByLabel('Label',{exact:true})).toHaveValue('Keep this unfinished correction');
 await browserExpect(dialog.getByLabel('Start (seconds)',{exact:true})).toHaveValue('1.25');
 expect(await f.read()).toEqual(f.before);
 expect(f.calls.filter(call=>call.name==='annotations:save')).toHaveLength(0);
},20000);

test('moving an edited clip past another segment keeps review, verify and undo attached to the edited ID',async()=>{
 const f=await setup(),dialog=await editFromReview(f.page);
 await dialog.getByLabel('Label',{exact:true}).fill('Moved clip');
 await dialog.getByLabel('Start (seconds)',{exact:true}).fill('9');
 await dialog.getByLabel('End (seconds)',{exact:true}).fill('12');
 await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
 await browserExpect(dialog).toHaveCount(0);
 await browserExpect(f.page.locator('#panel-export .review-caption h3')).toHaveText('Moved clip');
 await f.page.getByRole('button',{name:'Verify',exact:true}).click();
 await browserExpect.poll(async()=>(await f.read()).edited?.reviewStatus).toBe('verified');
 expect((await f.read()).sameLabel).toEqual(f.before.sameLabel);
 await f.page.getByRole('button',{name:'Undo last decision',exact:true}).click();
 await browserExpect.poll(async()=>(await f.read()).edited?.reviewStatus).toBe('pending');
 await browserExpect(f.page.locator('#panel-export .review-caption h3')).toHaveText('Moved clip');
 const reopened=await editFromReview(f.page);
 await browserExpect(reopened.getByLabel('Label',{exact:true})).toHaveValue('Moved clip');
 await browserExpect(reopened.getByLabel('Start (seconds)',{exact:true})).toHaveValue('9');
 await browserExpect(reopened.getByLabel('End (seconds)',{exact:true})).toHaveValue('12');
 expect((await f.read()).sameLabel).toEqual(f.before.sameLabel);
 expect(f.calls.filter(call=>call.name==='annotations:review').map(call=>({id:call.args.id,status:call.args.status}))).toEqual([{id:f.edited,status:'verified'},{id:f.edited,status:'pending'}]);
},20000);

test('a failed correction stays visible with its draft and can retry exactly one database update',async()=>{
 const f=await setup('trial',1440,true),dialog=await editFromReview(f.page);
 await dialog.getByLabel('Label',{exact:true}).fill('Retry this correction');
 await dialog.getByLabel('End (seconds)',{exact:true}).fill('4.2');
 await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
 await browserExpect(dialog.getByRole('alert')).toContainText('Isolated save failure');
 await browserExpect(dialog.getByLabel('Label',{exact:true})).toHaveValue('Retry this correction');
 await browserExpect(dialog.getByLabel('End (seconds)',{exact:true})).toHaveValue('4.2');
 expect(await f.read()).toEqual(f.before);
 await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
 await browserExpect(dialog).toHaveCount(0);
 expect((await f.read()).edited).toMatchObject({_id:f.edited,label:'Retry this correction',end_sec:4.2,source:'voice',reviewStatus:'pending'});
 expect(f.calls.filter(call=>call.name==='annotations:save')).toHaveLength(2);
 const history=await f.t.run(ctx=>ctx.db.query('trialEditHistory').collect());
 expect(history.filter(row=>row.description==='Edit segment')).toHaveLength(1);
},20000);

test('blank labels and invalid boundaries cannot alter a saved annotation',async()=>{
 const f=await setup(),dialog=await editFromReview(f.page);
 const label=dialog.getByLabel('Label',{exact:true}),start=dialog.getByLabel('Start (seconds)',{exact:true}),end=dialog.getByLabel('End (seconds)',{exact:true});
 for(const values of [{label:' ',start:'1',end:'3'},{label:'Label',start:'3',end:'2'},{label:'Label',start:'-1',end:'2'},{label:'Label',start:'1',end:'31'}]){
  await label.fill(values.label);await start.fill(values.start);await end.fill(values.end);
  const save=dialog.getByRole('button',{name:'Save changes',exact:true});
  if(await save.isEnabled())await save.click();
  await browserExpect(dialog).toBeVisible();expect(await f.read()).toEqual(f.before);
 }
 expect(f.calls.filter(call=>call.name==='annotations:save')).toHaveLength(0);
},20000);

test('boundary adjustments and preview use draft times without moving or replacing the existing review player',async()=>{
 const f=await setup();
 await f.page.locator('#panel-export video').evaluate((video:HTMLVideoElement)=>{(window as any).originalReviewPlayer=video;video.currentTime=2;});
 const dialog=await editFromReview(f.page);
 await dialog.getByRole('button',{name:'Start later by 0.1 seconds',exact:true}).click();
 await dialog.getByRole('button',{name:'End earlier by 0.1 seconds',exact:true}).click();
 expect(Number(await dialog.getByLabel('Start (seconds)',{exact:true}).inputValue())).toBeCloseTo(1.1,6);
 expect(Number(await dialog.getByLabel('End (seconds)',{exact:true}).inputValue())).toBeCloseTo(2.9,6);
 await browserExpect.poll(()=>dialog.locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThanOrEqual(2);
 await dialog.locator('video').evaluate((video:HTMLVideoElement)=>{video.currentTime=2;});
 await browserExpect.poll(()=>dialog.locator('video').evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeCloseTo(2,2);
 await dialog.getByRole('button',{name:'Use current position for start',exact:true}).click();
 expect(Number(await dialog.getByLabel('Start (seconds)',{exact:true}).inputValue())).toBeCloseTo(2,2);
 await dialog.getByRole('button',{name:'Preview clip',exact:true}).click();
 const preview=dialog.locator('video');
 await browserExpect.poll(()=>preview.evaluate((video:HTMLVideoElement)=>!video.paused)).toBe(true);
 const position=await preview.evaluate((video:HTMLVideoElement)=>video.currentTime);expect(position).toBeGreaterThanOrEqual(2);expect(position).toBeLessThan(2.9);
 await browserExpect.poll(()=>preview.evaluate((video:HTMLVideoElement)=>video.paused)).toBe(true);
 expect(await f.page.locator('#panel-export video').evaluate((video:HTMLVideoElement)=>video===(window as any).originalReviewPlayer)).toBe(true);
 expect(await f.read()).toEqual(f.before);
},20000);

test.each(['trial','personal'] as const)('%s: saved-segment Edit opens a usable editor at phone width',async kind=>{
 const f=await setup(kind,390,false,'annotate');
 await f.page.getByRole('button',{name:'Edit Fold shirt',exact:true}).first().click();
 const dialog=f.page.getByRole('dialog',{name:'Edit annotation',exact:true});
 await browserExpect(dialog).toBeVisible();
 await browserExpect(dialog.getByLabel('Label',{exact:true})).toBeVisible();
 await browserExpect(dialog.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();
 const size=await dialog.evaluate(element=>({left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right,width:window.innerWidth,overflow:element.scrollWidth>element.clientWidth+1}));
 expect(size.left).toBeGreaterThanOrEqual(0);expect(size.right).toBeLessThanOrEqual(size.width);expect(size.overflow).toBe(false);
 await f.page.screenshot({path:screenshots+kind+'-edit-phone.png'});
 expect(await f.read()).toEqual(f.before);
},20000);

test('opening and cancelling a correction preserves the active voice session and unfinished voice boundaries',async()=>{
 const f=await setup('trial',1440,false,'annotate');
 await f.page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 await f.page.evaluate(()=>(window as any).editingVoiceFixture.result('start',0,4));
 await f.page.evaluate(()=>(window as any).editingVoiceFixture.result('stop',1,6));
 const speechBefore=await f.page.evaluate(()=>(window as any).editingVoiceFixture.snapshot());
 expect(speechBefore).toEqual([{starts:1,stops:0,aborts:0}]);
 await f.page.getByRole('button',{name:'Edit Fold shirt',exact:true}).first().click();
 const dialog=f.page.getByRole('dialog',{name:'Edit annotation',exact:true});
 await dialog.getByLabel('Label',{exact:true}).fill('Unsaved manual change');
 await dialog.getByLabel('Label',{exact:true}).press('Space');
 expect(await f.page.locator('#panel-annotate video').evaluate((video:HTMLVideoElement)=>({paused:video.paused,time:video.currentTime}))).toEqual({paused:true,time:6});
 await dialog.getByRole('button',{name:'Cancel edit',exact:true}).click();
 expect(await f.page.evaluate(()=>(window as any).editingVoiceFixture.snapshot())).toEqual(speechBefore);
 await f.page.evaluate(()=>(window as any).editingVoiceFixture.result('Move sleeve',2));
 await browserExpect.poll(()=>f.backend.query(api.annotations.segments,{workspaceToken:f.workspaceToken,episodeId:f.episodeId})).toHaveLength(3);
 const rows=await f.backend.query(api.annotations.segments,{workspaceToken:f.workspaceToken,episodeId:f.episodeId});
 expect(rows.find(row=>row.label==='Move sleeve')).toMatchObject({start_sec:4,end_sec:6,source:'voice'});
 expect(await f.read()).toEqual(f.before);
},20000);
