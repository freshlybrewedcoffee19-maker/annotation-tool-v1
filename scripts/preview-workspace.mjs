import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
// A separate browser previews local files at the existing allowed media origin.
// This does not upload or publish any frontend files to Cloudflare.
const origin=process.env.LOCAL_PREVIEW_ORIGIN||'http://127.0.0.1:5174';
const state=path.resolve('.np-tools-private/image-preview-state.json');
const browser=await chromium.launch({channel:'chrome',headless:false});
const context=await browser.newContext({viewport:{width:1280,height:800},...await fs.access(state).then(()=>({storageState:state})).catch(()=>({}))});
const page=await context.newPage();
await page.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{document.title='LOCAL PREVIEW — Cheddar Vox (not published)';}));
await page.route('https://cheddarvox.com/**',async route=>{const url=new URL(route.request().url());await route.fulfill({response:await context.request.get(origin+url.pathname+url.search)});});
await page.goto('https://cheddarvox.com/annotate?preview=local');
if(await fs.access(state).then(()=>true).catch(()=>false)){
 await expect(page.getByRole('heading',{name:'Annotation workspace',exact:true})).toBeVisible({timeout:30000});
 await expect.poll(()=>page.locator('#panel-annotate img').evaluate(img=>img.naturalWidth),{timeout:30000}).toBeGreaterThan(0);
 await page.screenshot({path:path.resolve('outputs/image-annotation-preview/interactive-preview.png'),fullPage:true,animations:'disabled',timeout:30000});
}
console.log('Local image annotation preview opened in a separate Chrome window. This is not the published website.');
await new Promise(resolve=>browser.on('disconnected',resolve));
