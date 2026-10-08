import {test,expect} from '@playwright/test';

test('account, video upload, metadata locks and saved work follow the approved order',async({page,browser})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Label time segments in robotics videos by voice.',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Use my own video',exact:true}).click();
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 const email=`flow-${Date.now()}@example.invalid`;
 await page.getByRole('button',{name:'Continue with email',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Guided flow check');await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue(email);await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Guided flow check');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('Test-only-password-829!');
 await page.getByRole('button',{name:'Create account & continue',exact:true}).click();await expect(page.getByRole('heading',{name:'Bring your video.',exact:true})).toBeVisible({timeout:30000});
 await page.getByLabel('Upload video',{exact:true}).setInputFiles('public/sample.mp4');await expect(page.getByRole('heading',{name:'What details belong with this video?',exact:true})).toBeVisible({timeout:30000});
 await page.getByLabel('Setup metadata fields').fill('Task\nCamera');await page.getByRole('button',{name:'Save and continue',exact:true}).click();
 await page.getByLabel('Reusable Task').fill('Ironing');await page.getByLabel('Reusable Camera').fill('Overhead');await page.getByRole('button',{name:'Save and continue',exact:true}).click();
 await page.getByLabel('Setup labels').fill('approach\niron hold');await page.getByRole('button',{name:'Open annotation dashboard',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Annotation features'})).toBeVisible();await expect(page.getByLabel('Guided tasks')).toContainText('Turn on your mic');
 await page.getByRole('button',{name:'Work independently',exact:true}).click();await expect(page.getByLabel('Guided tasks')).toContainText('Work your way');await page.reload();await expect(page.getByRole('button',{name:'Guide me',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Metadata',exact:true}).click();await expect(page.getByLabel('Metadata: Task',{exact:true})).toHaveValue('Ironing');await expect(page.getByLabel('Metadata: Task',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Label time segments in robotics videos by voice.',exact:true})).toBeVisible();expect(errors).toEqual([]);
 const fresh=await browser.newContext();const returning=await fresh.newPage();await returning.goto(process.env.APP_URL??'http://127.0.0.1:5187');await returning.getByRole('button',{name:'Use my own video',exact:true}).click();await returning.getByLabel('Email',{exact:true}).fill(email);await returning.getByLabel('Password',{exact:true}).fill('Test-only-password-829!');await returning.getByRole('button',{name:'Sign in & continue',exact:true}).click();await returning.getByRole('button',{name:'sample.mp4',exact:true}).click();await expect(returning.getByRole('button',{name:'Guide me',exact:true})).toBeVisible();await fresh.close();
});

test('guided trial supports voice navigation, real rewards, review decisions and undo',async({page})=>{
 await page.addInitScript(()=>{class Speech{continuous=true;interimResults=true;lang='';onstart:any;onend:any;onresult:any;onerror:any;start(){let i=0;const results:any[]=[];(window as any).say=(text:string)=>{results[i]={isFinal:true,0:{transcript:text}};this.onresult({resultIndex:i,results});i++;};this.onstart?.();}stop(){this.onend?.();}abort(){}};(window as any).SpeechRecognition=Speech;});
 await page.goto('/');await page.getByRole('button',{name:'Try a sample video',exact:true}).click();await expect(page.locator('.trial-guide-line')).toContainText('Turn on your mic');
 await expect(page.locator('.trial-guide-line')).not.toContainText('Saved. Do the next one');await page.getByRole('button',{name:'Turn mic on',exact:true}).click();await expect(page.locator('.trial-guide-line')).toContainText('Say start');
 for(const[words,time]of[['start',2],['stop',4],['iron hold',4]]as const){await page.locator('video').evaluate((v:HTMLVideoElement,time)=>Object.defineProperty(v,'currentTime',{configurable:true,get:()=>time}),time);await page.evaluate(words=>(window as any).say(words),words);}
 await expect(page.locator('.trial-guide-line')).toContainText('Saved. Do the next one');await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.evaluate(()=>(window as any).say('open objects'));await expect(page.getByRole('button',{name:'Objects & outlines',exact:false})).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('Object name')).toBeVisible();
 await page.locator('.future-tools summary').click();
 await page.getByRole('button',{name:'Object detection Pending',exact:true}).click();await expect(page.getByLabel('Feature status')).toContainText('laptop checks');
 await page.getByRole('button',{name:'Review',exact:true}).click();await expect(page.getByLabel('Segment review')).toBeVisible();await page.getByRole('button',{name:'Turn mic on',exact:true}).click();await page.evaluate(()=>(window as any).say('verify'));await expect(page.locator('.review-status')).toHaveText('Verified');
 await page.evaluate(()=>(window as any).say('undo last decision'));await expect(page.locator('.review-status')).toHaveText('To review');
 const card=page.getByLabel('Review current segment');const box=await card.boundingBox();await page.mouse.move(box!.x+90,box!.y+20);await page.mouse.down();await page.mouse.move(box!.x+10,box!.y+20);await page.mouse.up();await expect(page.locator('.review-status')).toHaveText('Disqualified');
 await page.getByRole('button',{name:'Undo last decision',exact:true}).click();await expect(page.locator('.review-status')).toHaveText('To review');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
