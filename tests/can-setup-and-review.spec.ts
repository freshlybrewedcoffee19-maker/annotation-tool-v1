import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
async function paintVideo(page:import('@playwright/test').Page){const v=page.locator('video:visible'),start=await v.evaluate((v:HTMLVideoElement)=>v.currentTime);await v.evaluate((v:HTMLVideoElement)=>v.play());await expect.poll(()=>v.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(start+0.1);await v.evaluate((v:HTMLVideoElement)=>v.pause());await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}

test('save reusable setup, change one video, review clips and recover disqualified work',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Annotate your own videos',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/naive-opening-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Annotate your own videos',exact:true}).click();
 await page.getByLabel('Setup labels').fill('Pick up\nPlace down');await expect(page.getByRole('button',{name:'Save and continue'})).toBeEnabled();await page.screenshot({path:'test-results/naive-setup-desktop.png',fullPage:true});await page.getByRole('button',{name:'Save and continue'}).click();
 await page.getByLabel('Setup metadata fields').fill('Task\nCamera');await page.getByRole('button',{name:'Save and continue'}).click();
 await page.getByLabel('Reusable Task').fill('Object handling');await page.getByLabel('Reusable Camera').fill('Overhead');
 await page.getByRole('button',{name:'Open annotation dashboard'}).click();
 await page.getByLabel('Upload video',{exact:true}).setInputFiles('tests/fixtures/short.mp4');
 await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByLabel('Saved labels')).toHaveText('Pick upPlace down');await expect.poll(()=>page.locator('video:visible').evaluate((v:HTMLVideoElement)=>v.readyState>=3&&!v.seeking)).toBe(true);await paintVideo(page);await page.screenshot({path:'test-results/naive-annotation-desktop.png',fullPage:true});
 await page.getByRole('tab',{name:'Metadata',exact:true}).click();
 await expect(page.getByLabel('Metadata: Task',{exact:true})).toHaveValue('Object handling');
 await page.getByRole('button',{name:'Unlock Task for this video',exact:true}).click();await expect(page.getByLabel('Metadata: Task',{exact:true})).toBeEnabled();
 await page.getByLabel('Metadata: Task',{exact:true}).fill('Only this video');await page.getByRole('button',{name:'Save metadata values',exact:true}).click();
 await page.getByRole('tab',{name:'Annotate',exact:true}).click();
 await page.getByText('Your labels',{exact:true}).first().click();await page.getByLabel('Label list',{exact:true}).fill('Lift\nPlace down');await page.getByRole('button',{name:'Save labels',exact:true}).click();
 await expect(page.getByLabel('Saved labels')).toHaveText('LiftPlace down');
 await page.getByText('Label by hand',{exact:true}).click();await page.getByLabel('Start (seconds)',{exact:true}).fill('1');await page.getByLabel('End (seconds)',{exact:true}).fill('2');await page.getByRole('button',{name:'Add segment',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('tab',{name:'Export',exact:true}).click();
 const deck=page.getByLabel('Segment review');await expect(deck.getByRole('heading',{name:'Lift',exact:true})).toBeVisible();
 await deck.getByRole('button',{name:'Disqualify',exact:true}).click();await expect(deck.locator('.review-status')).toHaveText('Disqualified');
 const env=await fs.readFile('.env.local','utf8'),client=new ConvexHttpClient(env.match(/^VITE_CONVEX_URL=(.+)$/m)![1].trim());
 const token=await page.evaluate(()=>localStorage.getItem('np-workspace-token')!);
 expect(await client.query(api.annotations.exportAll,{workspaceToken:token})).toEqual([]);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export episode CSV',exact:true}).click();const file=await download;await file.saveAs('test-results/disqualified.csv');expect(await fs.readFile('test-results/disqualified.csv','utf8')).not.toContain('Lift');
 await page.reload();await expect(page.getByLabel('Segment review').locator('.review-status')).toHaveText('Disqualified');
 await page.getByLabel('Segment review').getByRole('button',{name:'Verify',exact:true}).click();await expect(page.getByLabel('Segment review').locator('.review-status')).toHaveText('Verified');
 expect(await client.query(api.annotations.exportAll,{workspaceToken:token})).toHaveLength(1);
 await expect.poll(()=>page.locator('video:visible').evaluate((v:HTMLVideoElement)=>v.readyState>=3&&!v.seeking)).toBe(true);await paintVideo(page);await page.screenshot({path:'test-results/naive-review-desktop.png',fullPage:true});
 await page.getByLabel('Segment review').getByRole('button',{name:'Edit annotation',exact:true}).click();await page.getByLabel('End (seconds)',{exact:true}).fill('2.5');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('tbody tr').first()).toContainText('pending');
 await page.getByRole('tab',{name:'Upload',exact:true}).click();await page.getByLabel('Upload video',{exact:true}).setInputFiles({name:'second.mp4',mimeType:'video/mp4',buffer:await fs.readFile('tests/fixtures/short.mp4')});
 await expect(page.getByLabel('Saved labels')).toHaveText('Pick upPlace down');await page.getByRole('tab',{name:'Metadata',exact:true}).click();await expect(page.getByLabel('Metadata: Task',{exact:true})).toHaveValue('Object handling');
 const eps=await client.query(api.annotations.episodes,{workspaceToken:token});const other='a'.repeat(64);await client.mutation(api.workspaces.create,{workspaceToken:other});const rows=await client.query(api.annotations.segments,{workspaceToken:token,episodeId:eps.find(e=>e.name==='short.mp4')!._id});
 await expect(client.mutation(api.annotations.review,{workspaceToken:other,id:rows[0]._id,status:'disqualified'})).rejects.toThrow('Video not found');
});

test('skip individual questions or all setup and trial starts directly with a playable video',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('button',{name:'Trial video annotation',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/naive-opening-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Annotate your own videos',exact:true}).click();await page.getByRole('button',{name:'Skip this question',exact:true}).click();await expect(page.getByLabel('Setup metadata fields')).toBeVisible();await page.screenshot({path:'test-results/naive-setup-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Skip to annotation',exact:true}).click();await expect(page.getByLabel('Upload video',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'nAIve Physics',exact:true}).click();await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>v.duration)).toBe(45);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(()=>page.locator('video:visible').evaluate((v:HTMLVideoElement)=>v.readyState>=3&&!v.seeking)).toBe(true);await paintVideo(page);await page.screenshot({path:'test-results/naive-annotation-mobile.png',fullPage:true});
});
