import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomInt} from 'node:crypto';
import path from 'node:path';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';

test('teammates join a project and video progress returns in a fresh browser',async({page,browser})=>{
 test.setTimeout(180000);
 const root=path.resolve('.'),url='https://precious-fish-294.convex.cloud';
 async function account(name:string){
  const email=`release-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!';
  const store=(args:object)=>{try{return JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/convex/bin/main.js'),'run','auth:store',JSON.stringify({args})],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{throw Error('Private test-account setup failed.');}};
  const created=store({type:'createAccountFromCredentials',provider:'password',account:{id:email,secret:password},profile:{name,email}});
  const code=String(randomInt(10000000,99999999));
  store({type:'createVerificationCode',provider:'security-verify',accountId:created.account._id,email,code,expirationTime:Date.now()+600000,allowExtraProviders:true});
  const client=new ConvexHttpClient(url);
  const result=await client.action(api.auth.signIn,{provider:'password',params:{flow:'email-verification',email,code}});
  if(!result.tokens)throw Error('Test-account setup failed.');
  client.setAuth(result.tokens.token);
  return {email,password,client};
 }
 const owner=await account('Release owner'),teammate=await account('Release reviewer');
 async function login(target:typeof page,user:typeof owner){
  await target.goto('/signin');
  await target.getByLabel('Email',{exact:true}).fill(user.email);
  await target.getByLabel('Password',{exact:true}).fill(user.password);
  await target.getByRole('button',{name:'Sign in & continue',exact:true}).click();
  await expect(target.getByRole('heading',{name:'What shall we annotate today?'})).toBeVisible({timeout:30000});
 }
 await login(page,owner);
 await page.getByLabel('Upload project videos').setInputFiles('public/sample.mp4');
 await expect(page.getByRole('button',{name:'Skip to annotation',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Skip to annotation',exact:true}).click();
 await expect.poll(()=>page.locator('video').first().evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 const workspaceToken=await owner.client.query(api.accounts.workspace,{});
 if(!workspaceToken)throw Error('Test workspace missing.');
 const episode=(await owner.client.query(api.annotations.episodes,{workspaceToken}))[0];
 const args={workspaceToken,episodeId:episode._id};
 await owner.client.mutation(api.annotations.save,{...args,label:'Release check',start_sec:1,end_sec:2});
 await page.locator('video').first().evaluate((v:HTMLVideoElement)=>{v.currentTime=3;});
 await expect.poll(async()=> (await owner.client.query(api.sessions.load,args))?.position).toBe(3);
 await page.goto('/workspace');
 await page.getByRole('button',{name:'sample',exact:true}).click();
 await page.getByRole('button',{name:'+ Collaborator',exact:true}).click();
 await page.getByLabel('Teammate access').selectOption('reviewer');
 await page.getByRole('button',{name:'Create invitation link',exact:true}).click();
 await expect(page.getByLabel('Invitation link')).toBeVisible();
 const invitation=await page.getByLabel('Invitation link').inputValue();
 const otherContext=await browser.newContext(),other=await otherContext.newPage();
 await login(other,teammate);
 await other.goto(invitation);
 await other.getByRole('button',{name:'Join project',exact:true}).click();
 await expect(other.getByRole('heading',{name:'sample',exact:true})).toBeVisible({timeout:30000});
 await other.getByRole('button',{name:'sample.mp4',exact:true}).click();
 await expect.poll(()=>other.locator('video').first().evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await other.goto('/workspace');
 const freshContext=await browser.newContext(),fresh=await freshContext.newPage();
 await login(fresh,owner);
 await fresh.getByRole('button',{name:'sample',exact:true}).click();
 await expect(fresh.getByRole('button',{name:'Continue',exact:true})).toBeVisible();
 await fresh.getByRole('button',{name:'Continue',exact:true}).click();
 await expect.poll(()=>fresh.locator('video').first().evaluate((v:HTMLVideoElement)=>v.currentTime)).toBe(3);
 await fresh.screenshot({path:'test-results/shared-project-progress.png'});
 await freshContext.close();await otherContext.close();
});
