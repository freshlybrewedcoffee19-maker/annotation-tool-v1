import {test,expect} from '@playwright/test';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
test('dataset services receives a private enquiry and preserves the annotation route',async({page})=>{
 const externalForms:string[]=[];page.on('request',r=>{if(r.url().includes('formspree'))externalForms.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'Dataset services',exact:true}).click();
 await expect(page).toHaveURL(/\/services$/);await expect(page.getByRole('heading',{name:'Sub-symbolic datasets for robotics and simulation.'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'What data does your lab need?'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'How fabric slips. And stays in place.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Explore sample dataset on Hugging Face'})).toHaveAttribute('href','https://huggingface.co/datasets/CaramelCoffee19/naive-physics-ironing-v0.2');
 const sample=page.getByLabel('Human ironing demonstration',{exact:true});await sample.scrollIntoViewIfNeeded();
 await expect.poll(()=>sample.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 const dimensions=await sample.evaluate((v:HTMLVideoElement)=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration}));
 expect(dimensions.height).toBeGreaterThan(dimensions.width);expect(Math.abs(dimensions.duration-91.752)).toBeLessThan(0.5);
 await page.getByRole('button',{name:'Pause sample video',exact:true}).click();
 for(const [time,label] of [[12,'Iron stroke'],[34,'Reposition'],[85,'Release']] as const){await sample.evaluate((v:HTMLVideoElement,t)=>{v.currentTime=t;},time);await expect.poll(()=>sample.evaluate((v:HTMLVideoElement)=>!v.seeking&&v.readyState>=2),{timeout:30000}).toBe(true);await expect(page.getByRole('figure',{name:'Sample ironing video with human-annotated action segments'}).getByText(label,{exact:true})).toBeVisible();}
 await page.setViewportSize({width:1440,height:1000});const table=page.getByRole('figure',{name:'Illustrated examples of physical interactions: folding fabric, sliding a block, and rolling a ball'});await table.scrollIntoViewIfNeeded();await expect(table).toHaveAttribute('data-playing','true');await page.locator('#dataset-request').screenshot({path:'test-results/services-contact-desktop.png'});await page.screenshot({path:'test-results/services-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/services-phone.png',fullPage:true});
 await expect(page.getByLabel('Name',{exact:true})).toBeHidden();const connect=page.getByRole('button',{name:'Connect with us for a custom dataset',exact:true});await expect(connect).toHaveAttribute('aria-expanded','false');await connect.click();await expect(connect).toHaveAttribute('aria-expanded','true');await expect(page.getByLabel('Name',{exact:true})).toBeFocused();await page.screenshot({path:'test-results/services-form-phone.png',fullPage:true});
 await page.getByLabel('Name',{exact:true}).fill('Dataset test');await connect.click();await expect(connect).toHaveAttribute('aria-expanded','false');await expect(page.getByLabel('Name',{exact:true})).toBeHidden();await connect.click();await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Dataset test');await page.getByLabel('Email',{exact:true}).fill('dataset-test@example.com');await page.getByLabel('What data do you have?').selectOption('both');await page.getByLabel('What are you building, and what should we capture and label?').fill('Browser test: collect fabric demonstrations with action intervals.');await page.getByRole('button',{name:'Send dataset request',exact:true}).click();await expect(page.getByRole('heading',{name:'Dataset request received'})).toBeVisible();expect(externalForms).toEqual([]);
 const workspaceToken=await page.evaluate(()=>localStorage.getItem('np-workspace-token')!);const client=new ConvexHttpClient(process.env.CONVEX_TEST_URL!);await expect(client.mutation(api.services.requestDataset,{workspaceToken,name:'Test',email:'bad',organization:'',task:'Meaningful sample task',volume:'',dataSource:'collect'})).rejects.toThrow('valid email');
 await page.getByRole('button',{name:'Back to the annotation tool',exact:true}).click();await page.getByRole('button',{name:'Trial video annotation',exact:true}).click();await expect(page).toHaveURL(/\/workspace$/);await expect(page.locator('video')).toBeVisible();await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
});

test('public pages appear without waiting for the private backend',async({page})=>{
 await page.route('**/*.convex.cloud/**',route=>route.abort());
 await page.routeWebSocket('**/*.convex.cloud/**',socket=>socket.close());
 for(const path of ['/','/services']){
  await page.goto(path,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{level:1,name:path==='/'?'Voice led video annotation tool.':'Sub-symbolic datasets for robotics and simulation.'})).toBeVisible({timeout:1000});
  await expect(page.getByText('Opening your private workspace...', {exact:true})).toHaveCount(0);
  console.log(JSON.stringify({path,paint:await page.evaluate(()=>performance.getEntriesByType('paint').map(p=>({name:p.name,ms:Math.round(p.startTime)})))}));
 }
});
