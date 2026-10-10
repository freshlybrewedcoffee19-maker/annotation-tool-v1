import fs from 'node:fs';
import {createHash} from 'node:crypto';
const ort='8d85527a010e294a26b274749f74294b2a32cec5',eigen='1d8b82b0740839c0de7f1242a3585e3390ff5f33';
const directory='public/licenses/onnx-sources';
fs.mkdirSync(directory,{recursive:true});
const noticePage='public/licenses/index.html';
let html=fs.readFileSync(noticePage,'utf8');
if(!html.includes('href="/licenses/onnx-sources/"')){html=html.replace('</ul><p>','<li><a href="/licenses/onnx-sources/">ONNX Runtime library source access and notices</a></li></ul><p>');if(!html.includes('href="/licenses/onnx-sources/"'))throw Error('Notice page link insertion failed');fs.writeFileSync(noticePage,html);}
const targets=[
 ['eigen-source.zip',`https://codeload.github.com/eigen-mirror/eigen/zip/${eigen}`,'05b19b49e6fbb91246be711d801160528c135e34'],
 ...['COPYING.README','COPYING.MPL2','COPYING.BSD','COPYING.MINPACK'].map(f=>[f,`https://raw.githubusercontent.com/eigen-mirror/eigen/${eigen}/${f}`]),
 ...['s390x-build.patch','s390x-build-werror.patch'].map(f=>[f,`https://raw.githubusercontent.com/microsoft/onnxruntime/${ort}/cmake/patches/eigen/${f}`]),
 ['onnxruntime-dependencies.txt',`https://raw.githubusercontent.com/microsoft/onnxruntime/${ort}/cmake/deps.txt`],
 ['emscripten-LICENSE.txt','https://raw.githubusercontent.com/emscripten-core/emscripten/4.0.23/LICENSE'],
 ['emscripten-AUTHORS.txt','https://raw.githubusercontent.com/emscripten-core/emscripten/4.0.23/AUTHORS'],
 ['musl-COPYRIGHT.txt','https://raw.githubusercontent.com/emscripten-core/emscripten/4.0.23/system/lib/libc/musl/COPYRIGHT'],
];
const manifestFile='scripts/license-evidence/onnx-source-files.json';
const previous=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):[];
const manifest=[];
for(const [file,url,sha1] of targets){
 const target=directory+'/'+file,known=previous.find(x=>x.file===file);let data;
 if(known&&fs.existsSync(target)){data=fs.readFileSync(target);if(createHash('sha256').update(data).digest('hex')!==known.sha256)throw Error('Source evidence checksum mismatch: '+file);}
 else {const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(file+': HTTP '+response.status);data=Buffer.from(await response.arrayBuffer());}
 if(sha1&&createHash('sha1').update(data).digest('hex')!==sha1)throw Error('Upstream dependency SHA1 mismatch: '+file);
 fs.writeFileSync(target,data);manifest.push({file,url,sha256:createHash('sha256').update(data).digest('hex')});
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
const workflowPaths=['.github/workflows/linux-wasm-ci-build-and-test-workflow.yml','tools/ci_build/github/azure-pipelines/templates/build-linux-wasm-step.yml','tools/ci_build/github/azure-pipelines/templates/linux-wasm-ci.yml'];
for(const p of workflowPaths){const r=await fetch(`https://raw.githubusercontent.com/microsoft/onnxruntime/${ort}/${p}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Workflow evidence HTTP '+r.status);const body=await r.text();fs.writeFileSync('audits/model-runtime-evidence/'+p.split('/').at(-1)+'.txt',body);console.log(p+'\n'+body.split('\n').filter(l=>/build.py|build_wasm|emsdk|xnnpack|eigen|minimal_build|build-params|BuildParams|build_params|publish/i.test(l)).join('\n'));}
console.log('Matching Eigen source, licence texts and ONNX patches collected and checksummed.');
