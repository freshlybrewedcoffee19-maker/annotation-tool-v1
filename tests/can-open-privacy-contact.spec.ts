import {test,expect} from '@playwright/test';
for(const width of [1440,390])test(`privacy contact opens the enquiry form at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const path of ['/services/#dataset-request','/services#dataset-request']){
  await page.goto(path,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'We label actions in your videos.',exact:true})).toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toBeInViewport();
  await expect(page).toHaveURL(/#dataset-request$/);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
 }
 for(const path of ['/services','/services/']){
  await page.goto(path,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'We label actions in your videos.',exact:true})).toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toBeHidden();
  await page.getByRole('link',{name:'Discuss your dataset',exact:true}).click();
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
 }
 for(const policy of ['/privacy/','/terms/']){
  await page.goto(policy,{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'dataset enquiry form',exact:true}).first().click();
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toBeInViewport();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const target=process.env.APP_URL?.startsWith('https:')?'live':'local';
 await page.screenshot({path:`outputs/privacy-contact-${target}-${width}.png`});
});
