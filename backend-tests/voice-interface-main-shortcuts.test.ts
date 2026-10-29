// @vitest-environment node
import {afterAll,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const boundary=fileURLToPath(new URL('./fixtures/v1-segment-editing-boundary.tsx',import.meta.url));
const main=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
const unusedPages:Record<string,string>={'./ImageWorkspace':'ImageWorkspace','./marketing/MarketingApp':'MarketingApp','./v2/Workspace':'VersionTwo','./ObjectBoxes':'ObjectBoxes','./Landing':'Landing','./Services':'Services','./SignIn':'SignIn','./ProjectWorkspace':'ProjectWorkspace','./ProjectCollaborators':'JoinProject'};
let browser:Browser,bundle:string,styles:string,media:Buffer;
beforeAll(async()=>{
 const built=await build({entryPoints:[main],bundle:true,write:false,outdir:'isolated-main-shortcuts',format:'esm',platform:'browser',jsx:'automatic',define:{'import.meta.env.VITE_CONVEX_URL':'"https://unused.test"','import.meta.env.VITE_TRIAL_VIDEO_PATH':'undefined'},plugins:[{name:'main-shortcut-isolation',setup(builder){
  builder.onResolve({filter:/^(convex\/react|@convex-dev\/auth\/react|\.\/workspace)$/},()=>({path:boundary}));
  builder.onResolve({filter:/^\.\//},args=>args.importer===main&&unusedPages[args.path]?{path:unusedPages[args.path],namespace:'unmounted-page'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'unmounted-page'},args=>({contents:`export function ${args.path}(){throw Error('Unexpected unrelated route: ${args.path}');}`}));
 }}]});
 bundle=built.outputFiles.find(file=>file.path.endsWith('.js'))!.text;styles=built.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 media=await readFile(fileURLToPath(new URL('../public/videos/iron-e05a44b0.mp4',import.meta.url)));
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterAll(async()=>{await browser?.close();});

test('real annotation page: one Space toggles once, S/E/1 save exact bounds, and the edit dialog blocks every shortcut',async()=>{
 const t=convexTest(schema,modules),workspaceToken='f'.repeat(64);
 const ids=await t.run(async ctx=>{
  const workspaceId=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial'});
  const storageId=await ctx.storage.store(new Blob([new Uint8Array(media)],{type:'video/mp4'}));
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Keyboard example.mp4',duration:30,frameRate:30,width:1280,height:720,storageId});
  const original=await ctx.db.insert('segments',{episodeId,label:'Fold shirt',start_sec:1,end_sec:3,source:'voice',segmentNumber:1,reviewStatus:'verified'});
  return {episodeId,original,storageUrl:await ctx.storage.getUrl(storageId)};
 });
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const errors:string[]=[],requests:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.exposeBinding('fixtureBackend',async(_source,operation:string,name:string,args:any)=>{
   if(operation==='query')return t.query(makeFunctionReference<'query'>(name),args);
   if(operation==='mutation'&&['annotations:save','sessions:save','productEvents:record'].includes(name))return t.mutation(makeFunctionReference<'mutation'>(name),args);
   throw Error('Unexpected backend call: '+operation+' '+name);
  });
  const initial={'np-workspace-token':workspaceToken,[`np-episode-${workspaceToken}`]:ids.episodeId,[`np-step-${workspaceToken}`]:'annotate',[`cv-activity-${workspaceToken}`]:'actions'};
  const url='https://voice-main.test/annotate';
  await page.route('**/*',route=>{
   const request=route.request().url();
   if(request===url)return route.fulfill({contentType:'text/html',body:`<style>${styles}</style><div id="root"></div><script>window.fixtureConfig=${JSON.stringify({workspaceToken,kind:'trial'})};Object.entries(${JSON.stringify(initial)}).forEach(([key,value])=>localStorage.setItem(key,value));sessionStorage.setItem('cv-headphones-annotation','dismissed');</script><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`});
   if(request===ids.storageUrl){
    const match=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/),headers={'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'};
    if(match){const from=Number(match[1]),to=match[2]?Math.min(Number(match[2]),media.length-1):media.length-1;return route.fulfill({status:206,contentType:'video/mp4',headers:{...headers,'Content-Range':`bytes ${from}-${to}/${media.length}`},body:media.subarray(from,to+1)});}
    return route.fulfill({contentType:'video/mp4',headers,body:media});
   }
   if(request==='https://voice-main.test/images/trial-0.png')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'});
   requests.push(request);return route.abort();
  });
  await page.routeWebSocket('**/*',socket=>{requests.push(socket.url());socket.close();});await page.goto(url);
  const video=page.locator('#panel-annotate video');await browserExpect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.readyState)).toBeGreaterThanOrEqual(2);
  await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();});
  await page.keyboard.press('Space');await browserExpect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.paused)).toBe(false);
  await page.keyboard.press('Space');await browserExpect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.paused)).toBe(true);
  await video.evaluate((node:HTMLVideoElement)=>{node.currentTime=4;});await page.keyboard.press('s');await browserExpect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.paused)).toBe(false);
  await video.evaluate((node:HTMLVideoElement)=>{node.currentTime=6;});await page.keyboard.press('e');await browserExpect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.paused)).toBe(true);
  await page.keyboard.press('1');await browserExpect.poll(async()=>(await t.query(api.annotations.segments,{workspaceToken,episodeId:ids.episodeId})).length).toBe(2);
  const rows=await t.query(api.annotations.segments,{workspaceToken,episodeId:ids.episodeId}),saved=rows.find(row=>row._id!==ids.original)!;
  expect(saved.label).toBe('Fold shirt');expect(saved.start_sec).toBeCloseTo(4,1);expect(saved.end_sec).toBeCloseTo(6,1);
  await browserExpect(page.getByLabel('Annotation shortcuts')).toBeVisible();
  await browserExpect(page.getByLabel('Annotation shortcuts')).toBeInViewport();
  await page.screenshot({path:fileURLToPath(new URL('../.np-tools-private/voice-ui-2026-10-30/annotation-shortcuts-desktop.png',import.meta.url))});
  await page.setViewportSize({width:390,height:844});await browserExpect(page.getByLabel('Annotation shortcuts')).toBeInViewport();await page.screenshot({path:fileURLToPath(new URL('../.np-tools-private/voice-ui-2026-10-30/annotation-shortcuts-phone.png',import.meta.url))});await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Edit Fold shirt',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Edit annotation',exact:true});await browserExpect(dialog).toBeVisible();
  const before=await video.evaluate((node:HTMLVideoElement)=>({time:node.currentTime,paused:node.paused}));
  await dialog.getByLabel('Label',{exact:true}).fill('Editable text');await dialog.getByLabel('Label',{exact:true}).press('Space');await dialog.getByLabel('Label',{exact:true}).press('s');await dialog.getByLabel('Label',{exact:true}).press('e');await dialog.getByLabel('Label',{exact:true}).press('1');
  await dialog.getByRole('heading',{name:'Edit annotation',exact:true}).evaluate(node=>{(node as HTMLElement).tabIndex=-1;(node as HTMLElement).focus();});
  for(const key of ['Space','s','e','1'])await page.keyboard.press(key);
  expect(await video.evaluate((node:HTMLVideoElement)=>({time:node.currentTime,paused:node.paused}))).toEqual(before);
  expect(await t.query(api.annotations.segments,{workspaceToken,episodeId:ids.episodeId})).toEqual(rows);
  await dialog.getByRole('button',{name:'Cancel edit',exact:true}).click();
 }finally{await context.close();expect(errors).toEqual([]);expect(requests).toEqual([]);}
},25000);
