// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const boundary=fileURLToPath(new URL('./fixtures/interface-retirement-boundary.tsx',import.meta.url));
const main=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
const sourceDirectory=fileURLToPath(new URL('../src/',import.meta.url));
const workspaceToken='d'.repeat(64);
const notice="Used the old drawing tools? Email us and we'll export your work.";
const draftStorage={
 [`cv-v2-draft-${workspaceToken}-old-episode`]:JSON.stringify({shape:{key:'unfinished-polygon',kind:'polygon',points:[.1,.2,.4,.5]},revision:7}),
 [`cv-v2-queue-${workspaceToken}-old-episode`]:JSON.stringify([{operation:'pending-save',shape:{key:'unsaved-box',kind:'box'},revision:1,error:'Offline'}]),
 [`cv-image-saves-${workspaceToken}`]:JSON.stringify([{key:'pending-image',episodeId:'old-image',filename:'image.png',label:'Blue cup',state:'saving'}]),
 [`cv-v2-selected-${workspaceToken}`]:'old-episode',
};
// These branches must never mount in the routes exercised here. Throwing detects
// accidental access rather than substituting pretend retirement UI.
const unusedPages:Record<string,string>={'./ImageWorkspace':'ImageWorkspace','./marketing/MarketingApp':'MarketingApp','./v2/Workspace':'VersionTwo','./ReviewWorkspace':'ReviewWorkspace','./ObjectBoxes':'ObjectBoxes','./Landing':'Landing','./Services':'Services','./SignIn':'SignIn','./ProjectWorkspace':'ProjectWorkspace','./ProjectCollaborators':'JoinProject','./GuidedTasks':'GuidedTasks'};
let browser:Browser,context:BrowserContext|undefined,mainBundle:string,navigationBundle:string;
let errors:string[]=[],unexpectedRequests:string[]=[],calls:string[]=[];
beforeAll(async()=>{
 const result=await build({entryPoints:[main],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env.VITE_CONVEX_URL':'"https://unused.test"','import.meta.env.VITE_TRIAL_VIDEO_PATH':'undefined'},plugins:[{name:'retirement-route-isolation',setup(builder){
  builder.onResolve({filter:/^(convex\/react|@convex-dev\/auth\/react|\.\/workspace)$/},()=>({path:boundary}));
  builder.onResolve({filter:/^\.\//},args=>args.importer===main&&unusedPages[args.path]?{path:unusedPages[args.path],namespace:'unmounted-page'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'unmounted-page'},args=>({contents:`export function ${args.path}(){throw Error('Unexpected retired or unrelated screen: ${args.path}');}`}));
 }}]});
 mainBundle=result.outputFiles[0].text;
 const navigation=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {WorkspaceToolRail} from './WorkspaceToolRail';import {VIDEO_ACTIVITIES} from './annotation-interface';createRoot(document.getElementById('root')).render(<WorkspaceToolRail items={VIDEO_ACTIVITIES} activity="actions" choose={activity=>window.chosenActivity=activity}/>);`,resolveDir:sourceDirectory,loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic'});
 navigationBundle=navigation.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(errors).toEqual([]);expect(unexpectedRequests).toEqual([]);});
afterAll(async()=>{await browser?.close();});

async function open(path:string,{activity='actions',image=false,navigation=false}:{activity?:string;image?:boolean;navigation?:boolean}={}){
 context=await browser.newContext();const page=await context.newPage();errors=[];unexpectedRequests=[];calls=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.exposeBinding('fixtureBackend',async(_source,kind:string,name:string)=>{
  calls.push(`${kind}:${name}`);
  if(kind!=='query')throw Error(`Unexpected data write: ${name}`);
  if(name==='annotations:episodes')return image?[{_id:'old-image',_creationTime:1,name:'Old image.png',mediaType:'image',duration:0,width:640,height:480}]:[{_id:'saved-video',_creationTime:1,name:'Retained video.mp4',duration:30}];
  if(['labels:list','annotations:segments','images:siblings'].includes(name))return [];
  throw Error(`Unexpected query: ${name}`);
 });
 const initial={...draftStorage,'np-workspace-token':workspaceToken,[`np-step-${workspaceToken}`]:'annotate',[`cv-activity-${workspaceToken}`]:activity,...(image?{[`np-episode-${workspaceToken}`]:'old-image'}:{})};
 const url='https://retirement.test'+path;
 await page.route('**/*',route=>{
  if(route.request().url()===url)return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script>window.fixtureConfig=${JSON.stringify({workspaceToken})};Object.entries(${JSON.stringify(initial)}).forEach(([key,value])=>localStorage.setItem(key,value));</script><script type="module">${(navigation?navigationBundle:mainBundle).replace(/<\/script/gi,'<\\/script')}</script>`});
  unexpectedRequests.push(route.request().url());return route.abort();
 });
 await page.routeWebSocket('**/*',socket=>{unexpectedRequests.push(socket.url());socket.close();});
 await page.goto(url);return page;
}

test.each(['/v2','/v2/','/v2/workspace'])('old route %s shows the email recovery notice without mounting a workspace or touching data',async path=>{
 const page=await open(path);
 await browserExpect(page.getByText(notice,{exact:true})).toBeVisible({timeout:2000});
 await browserExpect(page.getByRole('link',{name:'Email us',exact:true})).toHaveAttribute('href','mailto:riya.shah@cheddarvox.com');
 expect(await page.evaluate(()=>(window as any).workspaceProviderMounts??0)).toBe(0);
 expect(calls).toEqual([]);
 expect(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(draftStorage))).toEqual(draftStorage);
});

test.each(['masks','detection'])('a saved %s activity opens video annotation and preserves all retired browser drafts',async activity=>{
 const page=await open('/annotate',{activity});
 await browserExpect(page.getByRole('heading',{name:'Retained video.mp4',exact:true})).toBeVisible({timeout:2000});
 await browserExpect.poll(()=>page.evaluate(key=>localStorage.getItem(key),`cv-activity-${workspaceToken}`),{timeout:2000}).toBe('actions');
 expect(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(draftStorage))).toEqual(draftStorage);
 expect(calls.every(call=>call.startsWith('query:'))).toBe(true);
 await browserExpect(page.locator('a[href="/v2"]')).toHaveCount(0);
});

test('an old image selection opens recovery information instead of mounting the image editor',async()=>{
 const page=await open('/annotate',{image:true});
 await browserExpect(page.getByText(notice,{exact:true}).first()).toBeVisible({timeout:2000});
 expect(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(draftStorage))).toEqual(draftStorage);
 expect(calls.every(call=>call.startsWith('query:'))).toBe(true);
});

test('active video navigation exposes only annotation, review and export',async()=>{
 const page=await open('/navigation',{navigation:true});
 const navigation=page.getByRole('navigation',{name:'Annotation tools',exact:true});
 await browserExpect(navigation).toBeVisible();
 expect(await navigation.getByRole('button').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('Annotation'),expect.stringContaining('Review'),expect.stringContaining('Export')]));
 await browserExpect(navigation.getByRole('button')).toHaveCount(3,{timeout:2000});
 await navigation.getByRole('button',{name:/Review/}).click();
 expect(await page.evaluate(()=>(window as any).chosenActivity)).toBe('review');
});
