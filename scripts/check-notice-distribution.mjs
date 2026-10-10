import {build} from 'vite';
import fs from 'node:fs';
const targets=['@convex-dev/auth','@aws-sdk/credential-provider-http','@aws-sdk/credential-provider-login','@aws-sdk/nested-clients','guid-typescript','server-only'];
const chunks=[];
const inspect=scope=>({name:'notice-distribution-'+scope,generateBundle(_options,bundle){for(const entry of Object.values(bundle))if(entry.type==='chunk')chunks.push({scope,file:entry.fileName,modules:Object.entries(entry.modules).filter(([,info])=>info.renderedLength>0).map(([id,info])=>({id:id.replaceAll('\\','/').replace(process.cwd().replaceAll('\\','/')+'/',''),renderedLength:info.renderedLength}))});}});
await build({build:{write:false,copyPublicDir:false},plugins:[inspect('main')],worker:{plugins:()=>[inspect('worker')]},logLevel:'error'});
const packages=targets.map(name=>({name,browserChunks:chunks.filter(chunk=>chunk.modules.some(m=>m.id.includes('/node_modules/'+name+'/')||m.id.startsWith('node_modules/'+name+'/'))).map(chunk=>({scope:chunk.scope,file:chunk.file,modules:chunk.modules.filter(m=>m.id.includes('/node_modules/'+name+'/')||m.id.startsWith('node_modules/'+name+'/'))})),scope:'Current local frontend build, including worker chunks. Does not assess Convex backend bundles, CLI packages, other deployments or embedded WASM contents.'}));
fs.writeFileSync('audits/browser-notice-distribution.json',JSON.stringify({checkedAt:new Date().toISOString(),method:'Vite rendered module records; only modules with renderedLength > 0. Build uses existing configuration and writes no deployable files.',packages},null,2)+'\n');
for(const p of packages)console.log(p.name+': '+(p.browserChunks.length?'present in '+p.browserChunks.map(c=>c.scope+'/'+c.file).join(', '):'no rendered JS module in checked frontend chunks'));
