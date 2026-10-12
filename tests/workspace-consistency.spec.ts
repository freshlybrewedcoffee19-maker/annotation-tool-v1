import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomInt} from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';

async function account(){
 const root=path.resolve('.'),email=`layout-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!';
 const store=(args:object)=>JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/convex/bin/main.js'),'run','auth:store',JSON.stringify({args})],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const created=store({type:'createAccountFromCredentials',provider:'password',account:{id:email,secret:password},profile:{name:'Layout check',email}}),code=String(randomInt(10000000,99999999));
 store({type:'createVerificationCode',provider:'security-verify',accountId:created.account._id,email,code,expirationTime:Date.now()+600000,allowExtraProviders:true});
 const client=new ConvexHttpClient('https://precious-fish-294.convex.cloud'),result=await client.action(api.auth.signIn,{provider:'password',params:{flow:'email-verification',email,code}});
 if(!result.tokens)throw Error('Test account verification failed');client.setAuth(result.tokens.token);return {email,password,client};
}
for(const viewport of [{width:1280,height:800},{width:390,height:844}])test(`workspace stays consistent at ${viewport.width}px for landscape and portrait`,async({page})=>{
 test.setTimeout(240000);page.setDefaultTimeout(20000);await page.setViewportSize(viewport);
 const baseline=process.env.LAYOUT_BASELINE==='1';const tag=baseline?'before':process.env.LOCAL_PREVIEW==='1'?'preview':'live';
 const out=path.resolve('outputs/workspace-consistency',tag);await fs.mkdir(out,{recursive:true});
 if(process.env.LOCAL_PREVIEW==='1')await page.route('https://cheddarvox.com/**',async route=>{const url=new URL(route.request().url());await route.fulfill({response:await page.request.get('http://127.0.0.1:5174'+url.pathname+url.search)});});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const user=await account();await page.goto('/signin');await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Sign in & continue',exact:true}).click();
 await expect(page.getByRole('heading',{name:'What shall we annotate today?'})).toBeVisible({timeout:30000});
 const reports:object[]=[];let shared:any=null;
 async function snap(name:string,hasVideo=true){
  if(hasVideo){const v=page.locator('video:visible').first();if(await v.count()){await expect.poll(()=>v.evaluate((el:HTMLVideoElement)=>el.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);await expect.poll(()=>v.evaluate((el:HTMLVideoElement)=>!el.seeking)).toBe(true);}}
  const metrics=await page.evaluate(()=>{
   const main=document.querySelector('main.dashboard')!;const root=document.documentElement;const header=main.querySelector(':scope>header')!;const nav=main.querySelector('.step-navigation')!;
   const visible=(el:Element)=>!!(el as HTMLElement).offsetWidth&&!!(el as HTMLElement).offsetHeight&&!el.closest('[hidden]');
   const frame=Array.from(main.querySelectorAll('.workspace-frame,.signed-editor')).find(visible);const rail=frame?.querySelector('.workspace-tool-rail');const player=Array.from(main.querySelectorAll('video')).find(visible) as HTMLVideoElement|undefined;
   const rect=(el:Element|null|undefined)=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
   const button=nav.querySelector('button')!;
   const v=player&&rect(player)!;const fit=player&&v?Math.min(v.width/player.videoWidth,v.height/player.videoHeight):0;
   return {header:rect(header),nav:rect(nav),rail:rect(rail),frame:rect(frame),video:v,videoWidth:player?.videoWidth,videoHeight:player?.videoHeight,fitWidth:player?player.videoWidth*fit:0,fitHeight:player?player.videoHeight*fit:0,objectFit:player&&getComputedStyle(player).objectFit,videoTransform:player&&getComputedStyle(player).transform,font:getComputedStyle(button).fontSize,buttonHeight:button.getBoundingClientRect().height,scale:visualViewport?.scale,zoom:getComputedStyle(root).zoom,rootTransform:getComputedStyle(root).transform,window:{width:innerWidth,height:innerHeight},overflow:root.scrollWidth-innerWidth};
  });
  reports.push({name,...metrics});await fs.writeFile(path.join(out,`${viewport.width}-measurements.json`),JSON.stringify(reports,null,2));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`${viewport.width}-${name}.png`),fullPage:true});
  if(!baseline){expect(metrics.scale).toBe(1);expect(metrics.rootTransform).toBe('none');expect(metrics.zoom).toBe('1');expect(metrics.window).toEqual(viewport);expect(metrics.overflow).toBeLessThanOrEqual(1);expect(metrics.rail?.width).toBeGreaterThan(40);if(shared){expect(metrics.header).toEqual(shared.header);expect(metrics.nav).toEqual(shared.nav);expect(metrics.font).toBe(shared.font);expect(metrics.buttonHeight).toBe(shared.buttonHeight);expect(metrics.frame?.x).toBe(shared.frame?.x);expect(metrics.frame?.y).toBe(shared.frame?.y);expect(metrics.frame?.width).toBe(shared.frame?.width);}else shared=metrics;if(hasVideo){expect(metrics.objectFit).toBe('contain');expect(metrics.videoTransform).toBe('none');expect(metrics.video?.height).toBeGreaterThan(200);}}
  return metrics;
 }
 const rail=()=>page.getByRole('navigation',{name:'Annotation tools',exact:true});
 for(const [shape,file] of [['landscape','public/sample.mp4'],['portrait','public/services/iron-vertical.mp4']] as const){
  if(shape==='landscape')await page.getByLabel('Upload project videos').setInputFiles(file);else{await page.getByRole('tab',{name:'Upload',exact:true}).click();await snap(`${shape}-upload`);await page.getByLabel('Upload video',{exact:true}).setInputFiles(file);}
  await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true',{timeout:45000});
  const media=page.locator('#panel-annotate video');await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);
  await media.evaluate((v:HTMLVideoElement)=>v.play());await expect.poll(()=>media.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);await media.evaluate((v:HTMLVideoElement)=>v.pause());const annotate=await snap(`${shape}-annotate`);if(shape==='portrait')expect(annotate.videoHeight!).toBeGreaterThan(annotate.videoWidth!);else expect(annotate.videoWidth!).toBeGreaterThan(annotate.videoHeight!);
  if(!baseline){
   await page.getByRole('button',{name:'Collapse tool controls',exact:true}).click();await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeVisible();if(viewport.width>1000)await expect.poll(()=>page.locator('.workspace-frame:visible').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ')[1])).toBe('0px');const collapsed=await snap(`${shape}-collapsed`);expect(collapsed.fitHeight).toBeCloseTo(annotate.fitHeight,0);expect(collapsed.fitWidth).toBeCloseTo(annotate.fitWidth,0);
   await page.getByRole('button',{name:'Expand tool controls',exact:true}).click();await snap(`${shape}-expanded`);
   for(const tool of ['Outlines','Visibility','Relations','Masks','Tracking']){await rail().getByRole('button',{name:tool,exact:true}).click();await expect(rail().getByRole('button',{name:tool,exact:true})).toHaveAttribute('aria-pressed','true');await snap(`${shape}-tool-${tool}`);}
   await rail().getByRole('button',{name:'Annotation',exact:true}).click();
  }
  await page.getByRole('region',{name:'Microphone controls',exact:true}).getByText('Label by hand',{exact:true}).click();await page.getByRole('region',{name:'Microphone controls',exact:true}).getByLabel('Start (seconds)',{exact:true}).fill('1');await page.getByRole('region',{name:'Microphone controls',exact:true}).getByLabel('End (seconds)',{exact:true}).fill('2');await page.getByRole('region',{name:'Microphone controls',exact:true}).getByLabel('Label',{exact:true}).fill(`${shape} action`);await page.getByRole('button',{name:'Add segment',exact:true}).click();
  await expect(page.locator('.segments tbody tr')).toHaveCount(1);
  await page.getByRole('tab',{name:'Export',exact:true}).click();const reviewMedia=page.locator('#panel-export .review-card video').first();await expect.poll(()=>reviewMedia.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);
  await reviewMedia.evaluate((v:HTMLVideoElement)=>v.play());await expect.poll(()=>reviewMedia.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(1.1);await reviewMedia.evaluate((v:HTMLVideoElement)=>v.pause());const review=await snap(`${shape}-review`);if(!baseline){await page.getByRole('button',{name:'Collapse tool controls',exact:true}).click();const collapsedReview=await snap(`${shape}-review-collapsed`);expect(collapsedReview.fitWidth).toBeCloseTo(review.fitWidth,0);expect(collapsedReview.fitHeight).toBeCloseTo(review.fitHeight,0);await page.getByRole('button',{name:'Expand tool controls',exact:true}).click();await snap(`${shape}-review-expanded`);}
  if(!baseline){expect(review.header).toEqual(annotate.header);expect(review.nav).toEqual(annotate.nav);expect(review.font).toBe(annotate.font);expect(review.buttonHeight).toBe(annotate.buttonHeight);expect(review.rail?.width).toBe(annotate.rail?.width);expect(review.video?.height).toBe(annotate.video?.height);expect(review.video?.y).toBe(annotate.video?.y);expect(review.fitWidth).toBeCloseTo(annotate.fitWidth,0);expect(review.fitHeight).toBeCloseTo(annotate.fitHeight,0);}
  await page.getByRole('button',{name:'Verify',exact:true}).click();await expect(page.locator('.review-status').first()).toHaveText('Verified');
  await page.getByRole('button',{name:'Undo last decision',exact:true}).click();await expect(page.locator('.review-status').first()).toHaveText('To review');
  await page.getByRole('button',{name:'Disqualify',exact:true}).click();await expect(page.locator('.review-status').first()).toHaveText('Disqualified');await page.getByRole('button',{name:'Undo last decision',exact:true}).click();await expect(page.locator('.review-status').first()).toHaveText('To review');
  if(!baseline)await rail().getByRole('button',{name:'Export',exact:true}).click();await snap(`${shape}-export`);
  const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export episode CSV',exact:true}).click();const csv=await csvDownload;expect(csv.suggestedFilename()).toBe('episode-segments.csv');await csv.saveAs(path.join(out,`${viewport.width}-${shape}.csv`));expect(await fs.readFile(path.join(out,`${viewport.width}-${shape}.csv`),'utf8')).toContain(`${shape} action`);
  const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();const json=await jsonDownload;await json.saveAs(path.join(out,`${viewport.width}-${shape}.json`));expect(JSON.parse(await fs.readFile(path.join(out,`${viewport.width}-${shape}.json`),'utf8')).some((r:any)=>r.label===`${shape} action`)).toBe(true);
  await page.getByRole('tab',{name:'Annotate',exact:true}).click();await snap(`${shape}-returned`);
  if(!baseline){await rail().getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Edit annotation',exact:true}).click();await expect(page.getByRole('region',{name:'Microphone controls',exact:true}).getByLabel('Label',{exact:true})).toHaveValue(`${shape} action`);await page.getByRole('button',{name:'Save changes',exact:true}).click();}
 }
 if(!baseline){await page.goto('/upload');await expect(page.getByText('Layout check',{exact:true})).toBeVisible();const uploadMedia=page.locator('#panel-upload video');await expect.poll(()=>uploadMedia.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);await snap('direct-upload');await rail().getByRole('button',{name:'Annotation',exact:true}).click();await expect(page).toHaveURL(/\/annotate$/);await snap('direct-upload-return');}
 await fs.writeFile(path.join(out,`${viewport.width}-measurements.json`),JSON.stringify(reports,null,2));expect(errors).toEqual([]);
 console.log(`${tag}: ${viewport.width}px unchanged viewport and zoom; portrait + landscape upload, tools, panels, review, undo, CSV/JSON, edit and return checked.`);
});
