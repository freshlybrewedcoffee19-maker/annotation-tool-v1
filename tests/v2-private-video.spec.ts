import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomInt} from 'node:crypto';
import path from 'node:path';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
import fs from 'node:fs/promises';
test('private V2 uploads stay separate from V1 and reopen after signing in on a fresh browser',async({page,browser})=>{
 test.setTimeout(180000);const email=`v2-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!',root=path.resolve('.');
 async function localFrontend(target:typeof page){if(process.env.V2_LOCAL_FRONTEND!=='1')return;await target.context().route('https://cheddarvox.com/**',async route=>{const url=new URL(route.request().url()),p=url.pathname;if(!['/','/signin','/v2','/workspace'].includes(p)&&!p.startsWith('/assets/'))return route.continue();const file=path.join(root,'dist',p.startsWith('/assets/')?p:'index.html');try{await route.fulfill({body:await fs.readFile(file),contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});}catch{await route.continue();}});}
 await localFrontend(page);
 function store(args:object){try{return JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/convex/bin/main.js'),'run','auth:store',JSON.stringify({args})],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{throw Error('Private test-account setup failed.');}}
 const created=store({type:'createAccountFromCredentials',provider:'password',account:{id:email,secret:password},profile:{name:'V2 test annotator',email}}),code=String(randomInt(10000000,99999999));
 store({type:'createVerificationCode',provider:'security-verify',accountId:created.account._id,email,code,expirationTime:Date.now()+600000,allowExtraProviders:true});
 const client=new ConvexHttpClient('https://precious-fish-294.convex.cloud'),result=await client.action(api.auth.signIn,{provider:'password',params:{flow:'email-verification',email,code}});if(!result.tokens)throw Error('Test account could not verify.');client.setAuth(result.tokens.token);
 async function login(p:typeof page){await p.goto('/signin');await p.getByLabel('Email',{exact:true}).fill(email);await p.getByLabel('Password',{exact:true}).fill(password);await p.getByRole('button',{name:'Sign in & continue',exact:true}).click();await expect(p.getByRole('heading',{name:'What shall we annotate today?'})).toBeVisible({timeout:30000});await p.goto('/v2');await expect(p.getByLabel('Upload V2 videos')).toBeVisible();}
 await login(page);await page.getByLabel('Upload V2 videos').setInputFiles('public/sample.mp4');const video=page.locator('.v2-player video');await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:45000}).toBeGreaterThanOrEqual(2);
 const token=await page.evaluate(()=>localStorage.getItem('np-workspace-token')!);const [ep]=await client.query(api.v2.videos,{workspaceToken:token});expect(ep.private).toBe(true);expect(ep.sample).toBe(false);
 await page.locator('summary').filter({hasText:/^Your labels$/}).click();await page.getByLabel('V2 label list').fill('Object');await page.getByRole('button',{name:'Save labels',exact:true}).click();await expect(page.getByLabel('Annotation label')).toHaveValue('Object');
 await page.getByRole('button',{name:'Keypoint',exact:true}).click();const canvas=page.getByLabel('V2 annotation canvas'),b=(await canvas.boundingBox())!;await page.mouse.click(b.x+b.width*.4,b.y+b.height*.5);await page.getByRole('button',{name:'Save drawing',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Saved online'})).toBeVisible();await expect.poll(()=>client.query(api.v2.shapes,{workspaceToken:token,episodeId:ep.id})).toHaveLength(1);
 expect(await client.query(api.annotations.episodes,{workspaceToken:token})).toHaveLength(0);await client.mutation(api.projects.organiseExisting,{workspaceToken:token});expect(await client.query(api.projects.list,{workspaceToken:token})).toHaveLength(0);
 const unauthenticated=new ConvexHttpClient('https://precious-fish-294.convex.cloud');await expect(unauthenticated.query(api.v2.videos,{workspaceToken:token})).rejects.toThrow();
 const freshContext=await browser.newContext(),fresh=await freshContext.newPage();await localFrontend(fresh);await login(fresh);await fresh.getByRole('button',{name:/sample.mp4/}).click();await expect(fresh.getByRole('region',{name:'Saved V2 annotations'})).toContainText('Object');await expect.poll(()=>fresh.locator('.v2-player video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);await freshContext.close();
});
