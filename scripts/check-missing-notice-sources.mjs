import fs from 'node:fs';
import {createHash} from 'node:crypto';
const targets=[
 ['apache-2.0-standard','https://www.apache.org/licenses/LICENSE-2.0.txt'],
 ['convex-oauth-notice','https://raw.githubusercontent.com/get-convex/convex-auth/7eab86015b09cf91ac36a359beaaa4036aa24cc1/src/server/oauth/NOTICE.txt'],
 ['convex-test-license','https://raw.githubusercontent.com/get-convex/convex-auth/7eab86015b09cf91ac36a359beaaa4036aa24cc1/test-nextjs/LICENSE.txt'],
 ['guid-master-tree','https://api.github.com/repos/snico-dev/guid-typescript/git/trees/master?recursive=1'],
 ['aws-release','https://api.github.com/repos/aws/aws-sdk-js-v3/git/ref/tags/v3.997.0'],
 ['convex-auth-package','https://raw.githubusercontent.com/get-convex/convex-auth/7eab86015b09cf91ac36a359beaaa4036aa24cc1/package.json'],
 ['convex-auth-tree','https://api.github.com/repos/get-convex/convex-auth/git/trees/7eab86015b09cf91ac36a359beaaa4036aa24cc1?recursive=1'],
 ['guid-tree','https://api.github.com/repos/snico-dev/guid-typescript/git/trees/1870de806c3db7ba46c5b8a1387c60fc9dda9284?recursive=1'],
 ['aws-http','https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/packages-internal/credential-provider-http/LICENSE'],
 ['aws-login','https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/packages-internal/credential-provider-login/LICENSE'],
 ['aws-nested','https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/packages-internal/nested-clients/LICENSE'],
 ['aws-root','https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/LICENSE'],
 ['server-only','https://registry.npmjs.org/server-only/0.0.1'],
];
fs.mkdirSync('audits/upstream-notice-checks',{recursive:true});
const results=await Promise.all(targets.map(async([name,url])=>{try{
 const response=await fetch(url,{headers:{'User-Agent':'CheddarVox-notice-audit'}});const body=await response.text();
 fs.writeFileSync(`audits/upstream-notice-checks/${name}.txt`,body);
 const result={name,url,status:response.status,sha256:createHash('sha256').update(body).digest('hex')};
 if(name.endsWith('tree')&&response.ok)result.noticePaths=JSON.parse(body).tree.filter(x=>/licen[sc]e|notice|copying/i.test(x.path)).map(x=>x.path);
 return result;
 }catch(error){return {name,url,error:error.message};}}));
fs.writeFileSync('audits/upstream-notice-checks/results.json',JSON.stringify({checkedAt:new Date().toISOString(),note:'Current AWS main files are context only, not version-matched clearance. HTTP errors are not proof of absent rights.',results},null,2)+'\n');
for(const r of results)console.log(r.name,r.status??r.error,r.noticePaths??'');
