import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomInt} from 'node:crypto';
import path from 'node:path';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';

test('signed-in single and batch uploads annotate directly and preserve saved work',async({page})=>{
 test.setTimeout(180000);page.setDefaultTimeout(20000);page.on('pageerror',e=>console.log('Browser error:',e.message.slice(0,150)));
 if(process.env.LOCAL_PREVIEW==='1')await page.route('https://cheddarvox.com/**',async route=>{const url=new URL(route.request().url());await route.fulfill({response:await page.request.get((process.env.LOCAL_PREVIEW_ORIGIN??'http://127.0.0.1:5173')+url.pathname+url.search)});});
 const root=path.resolve('.'),email=`direct-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!';
 function store(args:object){return JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/convex/bin/main.js'),'run','auth:store',JSON.stringify({args})],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
 const created=store({type:'createAccountFromCredentials',provider:'password',account:{id:email,secret:password},profile:{name:'Direct annotation test',email}}),code=String(randomInt(10000000,99999999));
 store({type:'createVerificationCode',provider:'security-verify',accountId:created.account._id,email,code,expirationTime:Date.now()+600000,allowExtraProviders:true});
 const client=new ConvexHttpClient('https://precious-fish-294.convex.cloud');const result=await client.action(api.auth.signIn,{provider:'password',params:{flow:'email-verification',email,code}});
 if(!result.tokens)throw Error('Test account could not verify.');client.setAuth(result.tokens.token);
 await page.addInitScript(()=>{
  class Speech{continuous=false;interimResults=false;lang='';onstart:any;onend:any;onresult:any;onerror:any;start(){let index=0;const results:any[]=[];(window as any).say=(words:string)=>{results[index]={isFinal:true,0:{transcript:words}};this.onresult({resultIndex:index,results});index++;};this.onstart?.();}stop(){this.onend?.();}abort(){}}
  (window as any).SpeechRecognition=Speech;
 });
 await page.goto('/signin');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in & continue',exact:true}).click();
 await expect(page.getByRole('heading',{name:'What shall we annotate today?'})).toBeVisible({timeout:30000});
 async function tool(){await expect(page).toHaveURL(/\/annotate$/,{timeout:45000});await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeEnabled();await expect.poll(()=>page.locator('#panel-annotate video').evaluate((v:HTMLVideoElement)=>v.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);await expect(page.getByRole('tab',{name:/metadata/i})).toHaveCount(0);await expect(page.getByText(/setup metadata|skip to annotation|save and continue|export metadata/i)).toHaveCount(0);}
 await page.getByLabel('Upload project videos').setInputFiles('public/sample.mp4');await tool();console.log('Tool opened');
 const workspaceToken=(await client.query(api.accounts.workspace,{}))!;const first=(await client.query(api.annotations.episodes,{workspaceToken}))[0];const args={workspaceToken,episodeId:first._id};
 expect(await client.query(api.annotations.segments,args)).toEqual([]);
 await page.getByRole('button',{name:'Turn mic on',exact:true}).click();
 for(const [words,time] of [['start',1],['stop',2],['stop sign',2]] as const){await page.locator('#panel-annotate video').evaluate((v:HTMLVideoElement,t:number)=>{v.pause();v.currentTime=t;},time);await page.evaluate(words=>(window as any).say(words),words);}
 await expect.poll(()=>client.query(api.annotations.segments,args)).toHaveLength(1);expect((await client.query(api.annotations.segments,args))[0]).toMatchObject({label:'stop sign',start_sec:1,end_sec:2,source:'voice'});
 await expect(page.getByLabel('Edit label 1')).toHaveValue('stop sign');await page.getByRole('button',{name:'Turn mic off',exact:true}).click();
 await client.mutation(api.metadata.saveFields,{workspaceToken,text:'Legacy detail'});await client.mutation(api.metadata.saveValues,{...args,values:[{field:'Legacy detail',value:'Keep this value'}]});
 console.log('Opening projects');await page.goto('/workspace');await expect(page.getByLabel('Upload project videos')).toBeEnabled();
 await client.mutation(api.sessions.save,{...args,position:2,activity:'actions',step:'metadata'});
 await page.getByRole('button',{name:'sample',exact:true}).click();await page.getByRole('button',{name:'sample.mp4',exact:true}).click();await tool();console.log('Tool opened');await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');
 await page.goto('/setup');await expect(page.getByRole('button',{name:'Turn mic on',exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:'Annotate',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('navigation',{name:'Annotation tools',exact:true}).getByRole('button',{name:'Review',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'Export',exact:true})).not.toContainText('Metadata');
 console.log('Opening projects');await page.goto('/workspace');await page.getByLabel('Upload project videos').setInputFiles(['public/sample.mp4','public/sample.mp4']);await tool();console.log('Tool opened');
 const videos=await client.query(api.annotations.episodes,{workspaceToken});expect(videos).toHaveLength(3);expect(videos.find(v=>v._id===first._id)?.metadata).toContainEqual({field:'Legacy detail',value:'Keep this value'});expect(await client.query(api.annotations.segments,args)).toHaveLength(1);
 await page.screenshot({path:'test-results/direct-annotation-tool.png',fullPage:true});
 console.log('PASS: signed-in single/batch uploads, empty-label mic, new spoken label, reopening legacy metadata step, review without metadata, original annotation and metadata preserved. Speech input simulated; physical microphone not tested.');
});
