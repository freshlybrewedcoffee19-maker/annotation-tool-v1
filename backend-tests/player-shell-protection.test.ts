// @vitest-environment node
import {afterAll,afterEach,beforeAll,expect,test} from 'vitest';
import {chromium,expect as browserExpect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// This is a component integration check, not a live upload or phone-mic test.
// Real ObjectBoxes, WorkspaceLayout, EditorPlayback, TrialPlayer and tool panels
// are bundled unchanged. HTTP and WebSockets cannot leave the isolated browser.
let browser:Browser,context:BrowserContext|undefined,bundle:string;
let errors:string[]=[],externalRequests:string[]=[];
const fixture=fileURLToPath(new URL('./fixtures/player-shell-protection.tsx',import.meta.url));
beforeAll(async()=>{
 const result=await build({entryPoints:[fixture],bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'isolated-editor-data-boundary',setup(builder){
  builder.onResolve({filter:/^(\.\/workspace|convex\/react)$/},args=>/[/\\]src[/\\]/.test(args.importer)?{path:args.path,namespace:'editor-boundary'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'editor-boundary'},()=>({contents:`export {useTestWorkspace as useWorkspace,useTestQuery as useQuery,useTestMutation as useMutation,useTestConvex as useConvex} from ${JSON.stringify(fixture)};`,resolveDir:fileURLToPath(new URL('.',import.meta.url))}));
 }}]});
 bundle=result.outputFiles[0].text;
 browser=await chromium.launch({headless:true,channel:'chrome'});
});
afterEach(async()=>{await context?.close();context=undefined;expect(errors).toEqual([]);expect(externalRequests).toEqual([]);});
afterAll(async()=>{await browser?.close();});
async function setup(mode='signed'){
 context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();errors=[];externalRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  if(route.request().url()==='https://player-protection.test/')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`});
  externalRequests.push(route.request().url());return route.abort();
 });
 await page.routeWebSocket('**/*',socket=>{externalRequests.push(socket.url());socket.close();});
 await page.goto('https://player-protection.test/#'+mode);
 await browserExpect(page.getByRole('button',{name:'Probe microphone off',exact:true})).toBeVisible();
 return page;
}
async function snapshot(page:Page){return page.evaluate(()=>(window as any).playerProtection.snapshot());}

test('signed-in video playback, seeking and estimated frame controls still act on the same video',async()=>{
 const page=await setup();
 await page.getByRole('button',{name:'Play video',exact:true}).click();expect((await snapshot(page)).paused).toBe(false);
 await page.getByRole('button',{name:'Jump forward 5 seconds',exact:true}).click();expect(await snapshot(page)).toMatchObject({paused:true,position:5});
 await page.getByRole('button',{name:'Next estimated frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5.04);
 await page.getByRole('button',{name:'Previous estimated frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5);
 await page.getByRole('slider',{name:'Seek video'}).fill('18.5');expect((await snapshot(page)).position).toBe(18.5);
 await page.getByRole('button',{name:'Jump forward 10 seconds',exact:true}).click();expect((await snapshot(page)).position).toBe(20);
 await page.getByRole('button',{name:'Jump back 10 seconds',exact:true}).click();expect((await snapshot(page)).position).toBe(10);
 expect((await snapshot(page)).calls).toEqual([]);
});

test('collapsing controls or choosing another tool preserves the microphone child and unfinished text',async()=>{
 const page=await setup();
 await page.getByRole('button',{name:'Probe microphone off',exact:true}).click();
 await page.getByLabel('Unfinished note').fill('Keep this interrupted thought');
 const microphone=await page.getByTestId('microphone-probe').elementHandle();
 await page.getByRole('button',{name:'Collapse tool controls',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Expand tool controls',exact:true})).toHaveAttribute('aria-expanded','false');
 await page.getByRole('navigation',{name:'Annotation tools',exact:true}).getByRole('button',{name:'Outlines',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Collapse tool controls',exact:true})).toHaveAttribute('aria-expanded','true');
 await page.getByRole('navigation',{name:'Annotation tools',exact:true}).getByRole('button',{name:'Annotation',exact:true}).click();
 await browserExpect(page.getByLabel('Unfinished note')).toHaveValue('Keep this interrupted thought');
 await browserExpect(page.getByRole('button',{name:'Probe microphone on',exact:true})).toBeVisible();
 expect(await microphone!.evaluate(node=>node===document.querySelector('[data-testid="microphone-probe"]'))).toBe(true);
 expect(await snapshot(page)).toMatchObject({microphoneMounts:1,microphoneUnmounts:0});
});

test('the real saved annotation timeline still opens its clip without showing disqualified notes',async()=>{
 const page=await setup();
 await page.getByRole('button',{name:'Play video',exact:true}).click();
 await page.getByRole('region',{name:'Saved annotation timeline'}).getByRole('button',{name:'Turn left',exact:true}).click();
 await browserExpect(page.getByLabel('Selected note')).toHaveText('saved-note');
 expect(await snapshot(page)).toMatchObject({position:4,paused:true});
 await browserExpect(page.getByRole('button',{name:'Discarded note',exact:true})).toHaveCount(0);
});

test('trial playback retains exact frame stepping, typed jumps and saved edit undo/redo routing',async()=>{
 const page=await setup('trial');
 await page.getByRole('button',{name:'Next frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(.04);
 await page.keyboard.press('ArrowRight');expect((await snapshot(page)).position).toBeCloseTo(.08);
 await page.getByRole('textbox',{name:'Exact time (MM:SS:FF)'}).fill('00:05:10');
 await page.getByRole('button',{name:'Go',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5.4);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 expect((await snapshot(page)).calls).toEqual([
  {name:'trialHistory:apply',args:{workspaceToken:'isolated-player-workspace',episodeId:'isolated-player-episode',entryId:'previous-edit',direction:'undo'}},
  {name:'trialHistory:apply',args:{workspaceToken:'isolated-player-workspace',episodeId:'isolated-player-episode',entryId:'next-edit',direction:'redo'}},
 ]);
 await page.getByLabel('Unfinished note').fill('Text to correct');
 await page.keyboard.press('Control+z');
 expect((await snapshot(page)).calls).toHaveLength(2);
 await page.getByRole('button',{name:'Collapse Saved annotations panel',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Expand Saved annotations panel',exact:true})).toHaveAttribute('aria-expanded','false');
 await browserExpect(page.getByTestId('saved-annotations')).toHaveText('Turn left: 4–7 seconds');
 expect(await snapshot(page)).toMatchObject({microphoneMounts:1,microphoneUnmounts:0});
});

test('trial polygon draft undo/redo stays local and returns to saved edit history after cancel',async()=>{
 const page=await setup('trial');
 // Legacy trial drawing controls are hidden in the current UI. Dispatch their
 // existing handlers to protect the draft-history boundary without exposing them.
 await page.locator('.activity-objects').dispatchEvent('click');
 await page.getByRole('button',{name:'Object boxes',exact:true,includeHidden:true}).dispatchEvent('click');
 await page.getByLabel('Object name').evaluate((node:HTMLInputElement)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(node,'Cup');node.dispatchEvent(new Event('input',{bubbles:true}));});
 const polygon=page.getByRole('button',{name:'Draw polygon',exact:true,includeHidden:true});
 await browserExpect(polygon).toBeEnabled();await polygon.dispatchEvent('click');
 const drawing=page.getByLabel('Object box drawing area');
 await drawing.dispatchEvent('pointerdown',{button:0,clientX:20,clientY:20});
 await drawing.dispatchEvent('pointerdown',{button:0,clientX:80,clientY:60});
 const pointCount=()=>page.locator('.polygon-draft').evaluate(node=>node.getAttribute('points')!.trim().split(/\s+/).filter(Boolean).length);
 expect(await pointCount()).toBe(2);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await pointCount()).toBe(1);
 await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await pointCount()).toBe(2);
 expect((await snapshot(page)).calls).toEqual([]);
 await page.getByRole('button',{name:'Cancel box edit',exact:true,includeHidden:true}).dispatchEvent('click');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 expect((await snapshot(page)).calls).toHaveLength(1);
 expect((await snapshot(page)).calls[0].name).toBe('trialHistory:apply');
});

test('existing masks, tracking, visibility, review and relationship panels remain attached and selectable',async()=>{
 const page=await setup();
 const rail=page.getByRole('navigation',{name:'Annotation tools',exact:true});
 expect(await rail.getByRole('button').allTextContents()).toEqual(['Annotation','Outlines','Visibility','Relations','Masks','Tracking','Review','Export']);
 await rail.getByRole('button',{name:'Masks',exact:true}).click();
 await browserExpect(page.getByRole('region',{name:'Frame mask editor'})).toBeVisible();
 await rail.getByRole('button',{name:'Tracking',exact:true}).click();
 await browserExpect(page.getByRole('region',{name:'Assisted object tracking'})).toBeVisible();
 await browserExpect(page.locator('.frame-masks')).toHaveAttribute('hidden','');
 await rail.getByRole('button',{name:'Visibility',exact:true}).click();
 await browserExpect(page.getByText('Object visibility & reappearance',{exact:true})).toBeAttached();
 await browserExpect(page.getByText('Review object boxes & export',{exact:true})).toBeAttached();
 await browserExpect(page.getByText('Draft movement between boxes',{exact:true})).toBeAttached();
 await browserExpect(page.getByTestId('relationships')).toBeAttached();
 expect(await snapshot(page)).toMatchObject({microphoneMounts:1,microphoneUnmounts:0,calls:[]});
});

test('image wrapper retains its image and outline controls without adding video-only playback or panels',async()=>{
 const page=await setup('image');
 await browserExpect(page.getByRole('img',{name:'Existing uploaded image'})).toBeVisible();
 await browserExpect(page.getByRole('group',{name:'Video playback'})).toHaveCount(0);
 await browserExpect(page.locator('.frame-masks,.assisted-tracking,.action-objects,.spatial-review,.movement-draft')).toHaveCount(0);
 expect(await page.getByRole('navigation',{name:'Annotation tools',exact:true}).getByRole('button').allTextContents()).toEqual(['Annotation','Outlines','Review','Export']);
 await browserExpect(page.getByRole('button',{name:'Object boxes',exact:true})).toBeAttached();
 expect((await snapshot(page)).hasPlayer).toBe(false);
});

test('voice-only signed workspace preserves playback and exposes only annotation, review and export',async()=>{
 const page=await setup('voice-signed');
 const rail=page.getByRole('navigation',{name:'Annotation tools',exact:true});
 expect(await rail.getByRole('button').allTextContents()).toEqual(['Annotation','Review','Export']);
 await browserExpect(rail.getByRole('button',{name:'Annotation',exact:true})).toHaveAttribute('aria-pressed','true');
 await browserExpect(page.getByTestId('annotation-tools')).toBeVisible();
 await page.getByRole('button',{name:'Play video',exact:true}).click();expect((await snapshot(page)).paused).toBe(false);
 await page.getByRole('button',{name:'Pause video',exact:true}).click();expect((await snapshot(page)).paused).toBe(true);
 await page.getByRole('button',{name:'Jump forward 5 seconds',exact:true}).click();expect((await snapshot(page)).position).toBe(5);
 await page.getByRole('button',{name:'Next estimated frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5.04);
 await page.getByRole('button',{name:'Previous estimated frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5);
 await page.getByRole('slider',{name:'Seek video'}).fill('18.5');expect((await snapshot(page)).position).toBe(18.5);
 await page.getByRole('button',{name:'Jump forward 10 seconds',exact:true}).click();expect((await snapshot(page)).position).toBe(20);
 await page.getByRole('button',{name:'Jump back 10 seconds',exact:true}).click();expect((await snapshot(page)).position).toBe(10);
 expect(await snapshot(page)).toMatchObject({hasPlayer:true,calls:[],queryNames:[]});
 await browserExpect(page.locator('[aria-label="Object box drawing area"],[aria-label="Object drawing tools"],.frame-masks,.assisted-tracking,.action-objects,.spatial-review,.movement-draft,.relationships-panel')).toHaveCount(0);
});

test('voice-only signed controls and navigation retain the microphone child and unfinished note',async()=>{
 const page=await setup('voice-signed');
 await page.getByRole('button',{name:'Probe microphone off',exact:true}).click();
 await page.getByLabel('Unfinished note').fill('Keep this interrupted thought');
 const microphone=await page.getByTestId('microphone-probe').elementHandle();
 await page.getByRole('button',{name:'Collapse tool controls',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Expand tool controls',exact:true})).toHaveAttribute('aria-expanded','false');
 const rail=page.getByRole('navigation',{name:'Annotation tools',exact:true});
 await rail.getByRole('button',{name:'Review',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Collapse tool controls',exact:true})).toHaveAttribute('aria-expanded','true');
 await browserExpect(rail.getByRole('button',{name:'Review',exact:true})).toHaveAttribute('aria-pressed','true');
 await rail.getByRole('button',{name:'Export',exact:true}).click();
 await browserExpect(rail.getByRole('button',{name:'Export',exact:true})).toHaveAttribute('aria-pressed','true');
 await rail.getByRole('button',{name:'Annotation',exact:true}).click();
 await browserExpect(page.getByLabel('Unfinished note')).toHaveValue('Keep this interrupted thought');
 await browserExpect(page.getByRole('button',{name:'Probe microphone on',exact:true})).toBeVisible();
 expect(await microphone!.evaluate(node=>node===document.querySelector('[data-testid="microphone-probe"]'))).toBe(true);
 expect(await snapshot(page)).toMatchObject({microphoneMounts:1,microphoneUnmounts:0,calls:[],queryNames:[]});
});

test.each(['voice-signed','voice-trial'])('%s saved annotation timeline preserves clip selection and excludes discarded notes',async(mode)=>{
 const page=await setup(mode);
 await page.getByRole('button',{name:'Play video',exact:true}).click();
 await page.getByRole('region',{name:'Saved annotation timeline'}).getByRole('button',{name:'Turn left',exact:true}).click();
 await browserExpect(page.getByLabel('Selected note')).toHaveText('saved-note');
 expect(await snapshot(page)).toMatchObject({position:4,paused:true,calls:[]});
 await browserExpect(page.getByRole('button',{name:'Discarded note',exact:true})).toHaveCount(0);
 expect((await snapshot(page)).queryNames).toEqual(mode==='voice-trial'?['trialHistory:status']:[]);
});

test('voice-only trial keeps playback, frame controls, undo/redo and microphone state without drawing queries',async()=>{
 const page=await setup('voice-trial');
 await page.getByRole('button',{name:'Play video',exact:true}).click();expect((await snapshot(page)).paused).toBe(false);
 await page.getByRole('button',{name:'Pause video',exact:true}).click();expect((await snapshot(page)).paused).toBe(true);
 await page.getByRole('slider',{name:'Seek video'}).fill('4');expect((await snapshot(page)).position).toBe(4);
 await page.getByRole('button',{name:'Next frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(4.04);
 await page.keyboard.press('ArrowRight');expect((await snapshot(page)).position).toBeCloseTo(4.08);
 await page.getByRole('button',{name:'Previous frame',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(4.04);
 await page.getByRole('textbox',{name:'Exact time (MM:SS:FF)'}).fill('00:05:10');
 await page.getByRole('button',{name:'Go',exact:true}).click();expect((await snapshot(page)).position).toBeCloseTo(5.4);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 expect((await snapshot(page)).calls).toEqual([
  {name:'trialHistory:apply',args:{workspaceToken:'isolated-player-workspace',episodeId:'isolated-player-episode',entryId:'previous-edit',direction:'undo'}},
  {name:'trialHistory:apply',args:{workspaceToken:'isolated-player-workspace',episodeId:'isolated-player-episode',entryId:'next-edit',direction:'redo'}},
 ]);
 await page.getByRole('button',{name:'Probe microphone off',exact:true}).click();
 await page.getByLabel('Unfinished note').fill('Keep this trial note');
 const microphone=await page.getByTestId('microphone-probe').elementHandle();
 await page.keyboard.press('Control+z');expect((await snapshot(page)).calls).toHaveLength(2);
 // Native input undo may change text; restore the draft before checking panel state.
 await page.getByLabel('Unfinished note').fill('Keep this trial note');
 await page.getByRole('button',{name:'Collapse Saved annotations panel',exact:true}).click();
 await browserExpect(page.getByRole('button',{name:'Expand Saved annotations panel',exact:true})).toHaveAttribute('aria-expanded','false');
 await page.getByRole('button',{name:'Expand Saved annotations panel',exact:true}).click();
 await browserExpect(page.getByTestId('saved-annotations')).toHaveText('Turn left: 4–7 seconds');
 await browserExpect(page.getByLabel('Unfinished note')).toHaveValue('Keep this trial note');
 await browserExpect(page.getByRole('button',{name:'Probe microphone on',exact:true})).toBeVisible();
 expect(await microphone!.evaluate(node=>node===document.querySelector('[data-testid="microphone-probe"]'))).toBe(true);
 expect(await snapshot(page)).toMatchObject({microphoneMounts:1,microphoneUnmounts:0,queryNames:['trialHistory:status']});
 await browserExpect(page.locator('[aria-label="Object box drawing area"],[aria-label="Object drawing tools"],.frame-masks,.assisted-tracking,.action-objects,.spatial-review,.movement-draft,.relationships-panel')).toHaveCount(0);
});

test('voice-only trial cannot undo or redo retained drawing records through buttons or shortcuts',async()=>{
 const page=await setup('voice-trial-outlines');
 await browserExpect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
 await browserExpect(page.getByRole('button',{name:'Redo',exact:true})).toBeDisabled();
 await page.keyboard.press('Control+z');
 await page.keyboard.press('Control+y');
 await page.keyboard.press('Meta+z');
 await page.keyboard.press('Meta+Shift+z');
 expect(await snapshot(page)).toMatchObject({calls:[],queryNames:['trialHistory:status']});
});
