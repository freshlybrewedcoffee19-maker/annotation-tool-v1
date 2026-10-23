// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {api} from '../convex/_generated/api';

const modules=import.meta.glob('../convex/**/*.{ts,js}');
const boundary=fileURLToPath(new URL('./fixtures/v1-main-export-boundary.tsx',import.meta.url));
const main=fileURLToPath(new URL('../src/main.tsx',import.meta.url));
let browser:Browser,bundle:string,context:BrowserContext|undefined,pageErrors:string[]=[];
// None of these pages mount on /annotate when the fixture has no video URL.
// Throw if that changes, rather than substituting fake UI for the path under test.
const unusedPages:Record<string,string>={'./ImageWorkspace':'ImageWorkspace','./marketing/MarketingApp':'MarketingApp','./v2/Workspace':'VersionTwo','./ReviewWorkspace':'ReviewWorkspace','./ObjectBoxes':'ObjectBoxes','./Landing':'Landing','./Services':'Services','./SignIn':'SignIn','./ProjectWorkspace':'ProjectWorkspace','./ProjectCollaborators':'JoinProject','./GuidedTasks':'GuidedTasks'};
beforeAll(async()=>{
 const result=await build({entryPoints:[main],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env.VITE_CONVEX_URL':'"https://unused.test"','import.meta.env.VITE_TRIAL_VIDEO_PATH':'undefined'},plugins:[{name:'main-export-isolation',setup(builder){
  builder.onResolve({filter:/^(convex\/react|@convex-dev\/auth\/react|\.\/workspace)$/},()=>({path:boundary}));
  builder.onResolve({filter:/^\.\//},args=>args.importer===main&&unusedPages[args.path]?{path:unusedPages[args.path],namespace:'unmounted-page'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'unmounted-page'},args=>({contents:`export function ${args.path}(){throw Error('Unexpected route component: ${args.path}');}`}));
 }}]});
 bundle=result.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(pageErrors).toEqual([]);});
afterAll(async()=>{await browser?.close();});

test.each(['csv','json'] as const)('real main.tsx Export %s button downloads saved video annotations without changing stored work',async format=>{
 const t=convexTest(schema,modules),workspaceToken='c'.repeat(64);
 const ids=await t.run(async ctx=>{
  const workspaceId=await ctx.db.insert('workspaces',{token:workspaceToken,kind:'trial'});
  const episodeId=await ctx.db.insert('episodes',{workspaceId,name:'Trial "one".mp4',duration:30});
  const v2=await ctx.db.insert('episodes',{workspaceId,name:'Old V2.mp4',duration:30});
  await ctx.db.insert('v2Videos',{workspaceId,episodeId:v2,sample:false});
  const image=await ctx.db.insert('episodes',{workspaceId,name:'Old image.png',duration:0,mediaType:'image'});
  const kept=await ctx.db.insert('segments',{episodeId,label:'Fold "blue", shirt',start_sec:1.25,end_sec:3.75,source:'voice'});
  const excluded=await ctx.db.insert('segments',{episodeId,label:'Rejected',start_sec:4,end_sec:5,reviewStatus:'disqualified'});
  const oldV2=await ctx.db.insert('segments',{episodeId:v2,label:'Preserved V2',start_sec:4,end_sec:5});
  const oldImage=await ctx.db.insert('imageLabels',{episodeId:image,label:'Preserved image',normalizedLabel:'preserved image',clientKey:'old-image-label',source:'voice',reviewStatus:'pending'});
  return {episodeId,kept,excluded,oldV2,oldImage};
 });
 const readSaved=()=>t.run(async ctx=>Promise.all([ids.kept,ids.excluded,ids.oldV2,ids.oldImage].map(id=>ctx.db.get(id))));
 const before=await readSaved(),calls:string[]=[];
 context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage();pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.exposeBinding('fixtureBackend',async(_source,kind:string,name:string,args:any)=>{
  calls.push(`${kind}:${name}`);
  if(kind!=='query')throw Error(`Unexpected live-path mutation: ${name}`);
  return t.query(makeFunctionReference<'query'>(name),args);
 });
 await page.route('**/*',route=>route.request().url()==='https://v1-export.test/annotate'?route.fulfill({contentType:'text/html',body:`<div id="root"></div><script>window.fixtureConfig=${JSON.stringify({workspaceToken})};localStorage.setItem('np-workspace-token',${JSON.stringify(workspaceToken)});localStorage.setItem('np-episode-'+${JSON.stringify(workspaceToken)},${JSON.stringify(ids.episodeId)});localStorage.setItem('np-step-'+${JSON.stringify(workspaceToken)},'annotate');window.exportEvents=0;window.addEventListener('cv-exported',()=>window.exportEvents++);</script><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`}):route.abort());
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.goto('https://v1-export.test/annotate');
 await browserExpect(page.getByRole('cell',{name:'Fold "blue", shirt',exact:true})).toBeVisible();
 const button=page.getByRole('button',{name:`Export ${format.toUpperCase()}`,exact:true});await browserExpect(button).toBeEnabled();
 const downloadPromise=page.waitForEvent('download');await button.click();const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe(`segments.${format}`);
 expect(await download.failure()).toBeNull();
 const stream=await download.createReadStream();let text='';for await(const chunk of stream!)text+=chunk.toString();
 const expected=[{episode:'Trial "one".mp4',label:'Fold "blue", shirt',start_sec:1.25,end_sec:3.75}];
 if(format==='json')expect(JSON.parse(text)).toEqual(expected);
 else expect(text).toBe('episode,label,start_sec,end_sec\r\n"Trial ""one"".mp4","Fold ""blue"", shirt",1.25,3.75');
 expect(calls.filter(name=>name==='query:annotations:exportAll')).toHaveLength(1);
 expect(await page.evaluate(()=>(window as any).exportEvents)).toBe(1);
 await browserExpect(button).toBeEnabled();
 expect(await readSaved()).toEqual(before);
 expect(await t.query(api.annotations.exportAll,{workspaceToken})).toEqual(expected);
});
