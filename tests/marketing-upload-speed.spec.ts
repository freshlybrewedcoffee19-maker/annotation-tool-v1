import {test,expect,devices} from '@playwright/test';

const base='http://127.0.0.1:5181',file='public/videos/feedback-coffee-cc0-ad-v1.mp4';
const {defaultBrowserType,...phone}=devices['Pixel 7'];
test.use(phone);
test('new video and revision avoid repeated file copies; failed completion retries without reupload',async({page,context})=>{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===base)return route.continue();
  if(url.origin==='http://127.0.0.1:5176'&&url.pathname==='/api/marketing/media')return route.fulfill({response:await route.fetch({url:base+url.pathname+url.search})});
  return route.abort();
 });
 await page.routeWebSocket('**/*',socket=>socket.close());
 await page.addInitScript(()=>{
  sessionStorage.setItem('cv-headphones-marketing','dismissed');sessionStorage.setItem('preview-hold-completion','1');
  const copies={count:0,bytes:0};(window as any).__uploadCopies=copies;
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const blob=value instanceof Blob?value:value?.file instanceof Blob?value.file:null;if(blob){copies.count++;copies.bytes+=blob.size;}return put.call(this,value,key!);};
 });
 let puts=0;page.on('request',request=>{if(request.method()==='PUT'&&request.url().includes('/__preview-upload'))puts++;});
 await page.goto(base+'/video-feedback/workspace');
 await expect(page.getByRole('button',{name:'Upload a video',exact:true})).toBeEnabled();
 const cdp=await context.newCDPSession(page);
 // A real, throttled local PUT tests byte progress without touching private cloud storage.
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:-1,uploadThroughput:128*1024});
 await page.getByLabel('Upload marketing video',{exact:true}).setInputFiles(file);
 const progress=page.getByRole('progressbar',{name:'Video upload progress'});
 await expect(progress).toBeVisible();
 await expect.poll(async()=>{const value=Number(await progress.getAttribute('value'));return value>0&&value<100;}).toBe(true);
 await page.screenshot({path:'outputs/upload-speed-20261016/phone-progress.png'});
 await expect(page.getByText('Saving this version…',{exact:true})).toBeVisible({timeout:30000});
 expect(puts).toBe(1);expect(await page.evaluate(()=>(window as any).__uploadCopies.count)).toBe(1);
 expect(await page.evaluate(()=>(window as any).__marketingCalls.filter((name:string)=>name==='marketingFiles:resume'))).toHaveLength(0);
 await expect(progress).toHaveAttribute('value','100');
 await page.evaluate(()=>{sessionStorage.removeItem('preview-hold-completion');(window as any).__releaseMarketingCompletions();});
 await expect(page.getByRole('button',{name:'Download feedback',exact:true})).toBeVisible();
 await expect(page.locator('video')).toBeVisible();
 await page.getByRole('button',{name:'Download feedback',exact:true}).click();
 await page.getByText('Project settings',{exact:true}).click();
 await page.evaluate(()=>sessionStorage.setItem('preview-fail-marketingFiles:complete','1'));
 await page.getByLabel('Upload revised video',{exact:true}).setInputFiles(file);
 await expect(page.getByRole('button',{name:'Retry feedback-coffee-cc0-ad-v1.mp4',exact:true})).toBeVisible({timeout:30000});
 expect(puts).toBe(2);expect(await page.evaluate(()=>(window as any).__uploadCopies.count)).toBe(2);
 // Reopening remounts the upload form and recovers its saved status from browser storage.
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Download feedback',exact:true}).click();
 await page.getByText('Project settings',{exact:true}).click();
 await page.getByRole('button',{name:'Retry feedback-coffee-cc0-ad-v1.mp4',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(puts).toBe(2);expect(await page.evaluate(()=>(window as any).__uploadCopies.count)).toBe(2);
 expect(await page.evaluate(()=>(window as any).__marketingCalls.filter((name:string)=>name==='marketingFiles:resume'))).toHaveLength(0);
 await page.getByRole('button',{name:'Download feedback',exact:true}).click();
 await page.getByText('Project settings',{exact:true}).click();
 await expect(page.getByLabel('Video version',{exact:true}).locator('option')).toHaveCount(2);
 await page.screenshot({path:'outputs/upload-speed-20261016/revision-saved.png'});
});
