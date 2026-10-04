import {test,expect,chromium} from '@playwright/test';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
import fs from 'node:fs/promises';
test('Chrome and Edge trials cannot read edit delete upload or export each otherâ€™s saved work',async()=>{
 const browsers=await Promise.all([chromium.launch({channel:'chrome'}),chromium.launch({channel:'msedge'})]);
 try{
 const pages=await Promise.all(browsers.map(browser=>browser.newPage()));
 for(const page of pages){await page.goto(process.env.APP_URL??'http://127.0.0.1:5173');await expect(page.getByRole('button',{name:'Trial video annotation',exact:true})).toBeVisible();await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByLabel('Label list',{exact:true})).toHaveValue('initial_state\napproach\nposition\nreposition\nslip\niron_hold');await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.duration)).toBe(45);await expect(page.getByText('Label by hand',{exact:true})).toBeVisible();expect(await page.locator('details.manual-labeling').evaluate((d:HTMLDetailsElement)=>d.open)).toBe(false);}
 const tokens=await Promise.all(pages.map(page=>page.evaluate(()=>localStorage.getItem('np-workspace-token')!)));expect(tokens[0]).not.toBe(tokens[1]);
 const env=await fs.readFile('.env.local','utf8');const client=new ConvexHttpClient(process.env.CONVEX_TEST_URL??env.match(/^VITE_CONVEX_URL=(.+)$/m)![1].trim());
 const spaces=await Promise.all(tokens.map(workspaceToken=>client.query(api.annotations.episodes,{workspaceToken})));expect(spaces[0]).toHaveLength(1);expect(spaces[1]).toHaveLength(1);expect(spaces[0][0]._id).not.toBe(spaces[1][0]._id);for(const space of spaces){expect(space[0].metadata).toHaveLength(32);expect(space[0].metadata!.every(row=>row.value)).toBe(true);}
 const id=await client.mutation(api.annotations.save,{workspaceToken:tokens[0],episodeId:spaces[0][0]._id,label:'approach',start_sec:1,end_sec:2});
 expect(await client.query(api.annotations.exportAll,{workspaceToken:tokens[0]})).toHaveLength(1);expect(await client.query(api.annotations.exportAll,{workspaceToken:tokens[1]})).toEqual([]);
 await expect(client.query(api.annotations.segments,{workspaceToken:tokens[1],episodeId:spaces[0][0]._id})).rejects.toThrow('Video not found');
 await expect(client.mutation(api.annotations.save,{workspaceToken:tokens[1],id,episodeId:spaces[0][0]._id,label:'slip',start_sec:1,end_sec:2})).rejects.toThrow('Video not found');
 await expect(client.mutation(api.annotations.remove,{workspaceToken:tokens[1],id})).rejects.toThrow('Video not found');
 await expect(client.mutation(api.media.setFrameRate,{workspaceToken:tokens[1],episodeId:spaces[0][0]._id,frameRate:60})).rejects.toThrow('Video not found');
 await expect(client.mutation(api.metadata.saveValues,{workspaceToken:tokens[1],episodeId:spaces[0][0]._id,values:[{field:'task',value:'changed'}]})).rejects.toThrow('Video not found');
 await client.mutation(api.labels.save,{workspaceToken:tokens[0],text:'Only Chrome'});expect(await client.query(api.labels.list,{workspaceToken:tokens[1]})).toEqual(['initial_state','approach','position','reposition','slip','iron_hold']);
 const blob=await fs.readFile('tests/fixtures/short.mp4');const url=await client.mutation(api.annotations.uploadUrl,{workspaceToken:tokens[0]});const upload=await fetch(url,{method:'POST',headers:{'Content-Type':'video/mp4','X-Workspace-Token':tokens[0]},body:blob});expect(upload.ok).toBe(true);const {storageId}=await upload.json();
 await expect(client.mutation(api.annotations.addEpisode,{workspaceToken:tokens[1],storageId,name:'stolen.mp4',duration:5.055})).rejects.toThrow('own workspace');
 expect((await client.query(api.annotations.segments,{workspaceToken:tokens[0],episodeId:spaces[0][0]._id}))[0].label).toBe('approach');
 await pages[0].reload();await expect(pages[0].locator('tbody tr')).toHaveCount(1);await pages[1].reload();await expect(pages[1].locator('tbody tr')).toHaveCount(0);
 console.log('TWO BROWSERS: private 45-second trials; six matching labels; 32 filled metadata fields\nCROSS-BROWSER READ / EDIT / DELETE / METADATA / UPLOAD: rejected\nCROSS-BROWSER LABELS AND EXPORTS: isolated\nREFRESH: Chrome 1 segment; Edge 0 segments');
 }finally{await Promise.all(browsers.map(browser=>browser.close()));}
});
