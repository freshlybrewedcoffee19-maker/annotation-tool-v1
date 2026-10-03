import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('custom labels survive refresh and CSV preserves old segments plus three new labels',async({page})=>{
 await page.goto('/');
 await expect(page.getByLabel('Label list',{exact:true})).toBeEnabled();
 const originalLabels=await page.getByLabel('Label list',{exact:true}).inputValue();
 try{
 await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeEnabled();
 async function csv(){const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const file=await pending;const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');}
 const before=await csv();
 await page.getByLabel('Label list',{exact:true}).fill('Opening\nDemonstration\nClosing');
 await page.getByRole('button',{name:'Save labels',exact:true}).click();
 await expect(page.getByLabel('Label',{exact:true}).locator('option:not([disabled])')).toHaveText(['Opening','Demonstration','Closing']);
 await page.reload();
 await expect(page.getByLabel('Label list',{exact:true})).toHaveValue('Opening\nDemonstration\nClosing');
 await expect(page.getByLabel('Label',{exact:true}).locator('option:not([disabled])')).toHaveText(['Opening','Demonstration','Closing']);
 // Editing times without choosing another label keeps a label absent from the new list.
 const oldEpisodeId=await page.getByLabel('Episode',{exact:true}).locator('option').evaluateAll(options=>(options.find(o=>o.textContent==='short.mp4') as HTMLOptionElement).value);
 await page.getByLabel('Episode',{exact:true}).selectOption(oldEpisodeId);
 await expect(page.locator('tbody tr')).toHaveCount(2);
 const oldRow=page.locator('tbody tr').first();
 const oldLabel=await oldRow.locator('td').first().innerText();
 await oldRow.getByRole('button',{name:'Edit',exact:true}).click();
 await expect(page.getByText(`Current label: ${oldLabel}`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(oldRow.locator('td').first()).toHaveText(oldLabel);
 await page.getByLabel('Upload video',{exact:true}).setInputFiles({name:'custom-label-demo.mp4',mimeType:'video/mp4',buffer:await fs.readFile('tests/fixtures/short.mp4')});
 await expect(page.locator('video')).toBeVisible();
 await expect(page.getByLabel('Episode',{exact:true})).toContainText('custom-label-demo.mp4');
 await expect(page.locator('tbody tr')).toHaveCount(0);
 for(const [i,label] of ['Opening','Demonstration','Closing'].entries()){
 await page.getByLabel('Start (seconds)',{exact:true}).fill(String(i));
 await page.getByLabel('End (seconds)',{exact:true}).fill(String(i+0.75));
 await page.getByLabel('Label',{exact:true}).selectOption(label);
 await page.getByRole('button',{name:'Add segment',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(i+1);
 }
 await page.reload();
 await expect(page.locator('tbody tr')).toHaveCount(3);
 const after=await csv();
 const oldLines=before.split('\r\n').slice(1).filter(Boolean);
 const afterLines=after.split('\r\n').slice(1);
 for(const line of oldLines){const index=afterLines.indexOf(line);expect(index).toBeGreaterThanOrEqual(0);afterLines.splice(index,1);}
 expect(afterLines).toEqual(['"custom-label-demo.mp4","Opening",0,0.75','"custom-label-demo.mp4","Demonstration",1,1.75','"custom-label-demo.mp4","Closing",2,2.75']);
 await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/custom-labels.csv',after);
 await page.screenshot({path:'test-results/custom-labels.png',fullPage:true});
 console.log('EXPORTED_CSV_VERBATIM\n'+after);
 }finally{
 await page.getByLabel('Label list',{exact:true}).fill(originalLabels);
 await page.getByRole('button',{name:'Save labels',exact:true}).click();
 await expect(page.getByRole('button',{name:'Save labels',exact:true})).toBeEnabled();
 }
});
