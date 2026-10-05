import {test,expect} from '@playwright/test';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
test('dataset services receives a private enquiry and preserves the annotation route',async({page})=>{
 const externalForms:string[]=[];page.on('request',r=>{if(r.url().includes('formspree'))externalForms.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'Dataset services',exact:true}).click();
 await expect(page).toHaveURL(/\/services$/);await expect(page.getByRole('heading',{name:'From raw data to a reviewed dataset.'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'What data does your lab need?'})).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/services-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/services-phone.png',fullPage:true});
 await page.getByLabel('Name',{exact:true}).fill('Dataset test');await page.getByLabel('Email',{exact:true}).fill('dataset-test@example.com');await page.getByLabel('What data do you have?').selectOption('both');await page.getByLabel('What are you building, and what should we capture and label?').fill('Browser test: collect fabric demonstrations with action intervals.');await page.getByRole('button',{name:'Send dataset request',exact:true}).click();await expect(page.getByRole('heading',{name:'Dataset request received'})).toBeVisible();expect(externalForms).toEqual([]);
 const workspaceToken=await page.evaluate(()=>localStorage.getItem('np-workspace-token')!);const client=new ConvexHttpClient(process.env.CONVEX_TEST_URL!);await expect(client.mutation(api.services.requestDataset,{workspaceToken,name:'Test',email:'bad',organization:'',task:'Meaningful sample task',volume:'',dataSource:'collect'})).rejects.toThrow('valid email');
 await page.getByRole('button',{name:'Try the annotation tool',exact:true}).click();await expect(page).toHaveURL(/\/workspace$/);await expect(page.locator('video')).toBeVisible();await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
});
