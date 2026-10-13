import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

// Browser-memory preview only: no Convex accounts, sessions, files or records.
test('upload, feedback, revision and done keep every version without approval steps',async({browser})=>{
 const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);
 const connections:string[]=[],errors:string[]=[];
 await page.route(/https?:\/\/(?!127\.0\.0\.1:5176\b)/,route=>{connections.push(route.request().url());return route.abort();});
 page.on('websocket',ws=>{if(!ws.url().startsWith('ws://127.0.0.1:5176'))connections.push(ws.url());});page.on('pageerror',error=>errors.push(error.message));
 await fs.mkdir('outputs/marketing-simple-preview',{recursive:true});
 await page.goto('http://127.0.0.1:5176/marketing');await expect(page.getByRole('heading',{name:'Show your editor exactly what you mean.'})).toBeVisible();await page.screenshot({path:'outputs/marketing-simple-preview/entry.png',fullPage:true});
 await page.getByRole('button',{name:'Upload a video',exact:true}).click();await expect(page.getByRole('heading',{name:'Your video feedback board'})).toBeVisible();
 for(const name of ['Feedback 0','Revision 0','Done 0'])await expect(page.getByRole('heading',{name})).toBeVisible();
 await page.getByLabel('Upload marketing video').setInputFiles('public/sample.mp4');await expect(page.getByLabel('Feedback transcript')).toBeVisible();
 await page.getByLabel('Start (seconds)',{exact:true}).fill('1');await page.getByLabel('Stop (seconds)',{exact:true}).fill('3');await page.getByLabel('Feedback transcript').fill('Shorten the opening.');await page.getByRole('button',{name:'Save feedback',exact:true}).click();await expect(page.getByText('Shorten the opening.',{exact:true})).toBeVisible();await expect(page.locator('.marketing-page-heading').getByText('Revision',{exact:true})).toBeVisible();
 await page.getByLabel('Upload revised video').setInputFiles('public/sample.mp4');await expect(page.getByLabel('Video version').locator('option')).toHaveCount(2);await expect(page.locator('.marketing-page-heading').getByText('Feedback',{exact:true})).toBeVisible();await expect(page.getByRole('group',{name:'Video playback',exact:true})).toHaveCount(1);
 await expect(page.getByRole('tab',{name:'Review',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/finalis|approv|delet/i})).toHaveCount(0);await expect(page.getByRole('button',{name:'Create review link',exact:true})).toBeHidden();
 await page.screenshot({path:'outputs/marketing-simple-preview/tool-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/marketing-simple-preview/tool-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Mark done',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'This video is done.'})).toBeVisible();await expect(page.getByLabel('Video version').locator('option')).toHaveCount(2);await expect(page.getByText('Shorten the opening.',{exact:true})).toBeVisible();await expect(page.getByLabel('Feedback transcript')).toHaveCount(0);await expect(page.getByLabel('Upload revised video')).toHaveCount(0);
 await page.getByRole('button',{name:'Continue feedback',exact:true}).click();await expect(page.getByLabel('Feedback transcript')).toBeVisible();await page.getByRole('button',{name:'Mark done',exact:true}).click();await page.getByRole('link',{name:'Back to board'}).click();await expect(page.getByRole('heading',{name:'Done 1'})).toBeVisible();await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'outputs/marketing-simple-preview/board.png',fullPage:true});
 await page.goto('http://127.0.0.1:5176/marketing/board?example=1');await expect(page.getByRole('button',{name:/Example video/})).toBeVisible();
 await page.goto('http://127.0.0.1:5176/marketing/card/preview-video?example=1');await expect(page.getByLabel('Feedback transcript')).toBeVisible();await expect(page.getByRole('button',{name:'Mark done',exact:true})).toBeVisible();
 expect(connections).toEqual([]);expect(errors).toEqual([]);await context.close();
});
