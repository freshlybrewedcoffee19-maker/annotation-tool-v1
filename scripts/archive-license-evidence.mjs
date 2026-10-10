import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='scripts/license-evidence';await fs.mkdir(root,{recursive:true});
const runtime='8d85527a010e294a26b274749f74294b2a32cec5';
const sources=[
 ['onnxruntime-LICENSE.txt',`https://raw.githubusercontent.com/microsoft/onnxruntime/${runtime}/LICENSE`],
 ['onnxruntime-ThirdPartyNotices.txt',`https://raw.githubusercontent.com/microsoft/onnxruntime/${runtime}/ThirdPartyNotices.txt`],
 ['slimsam-model-card.txt','https://huggingface.co/Xenova/slimsam-77-uniform/resolve/5850ab45f587c112167512ffef949107115e26a0/README.md'],
 ['nanotrack-README.txt','https://raw.githubusercontent.com/HonglinChu/SiamTrackers/248663fde6bf7c40190cf10ee396d5662919ecd3/NanoTrack/README.md'],
 ];
const manifest=[];
for(const [file,url] of sources){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Evidence unavailable: ${file} (${r.status})`);const data=Buffer.from(await r.arrayBuffer());await fs.writeFile(root+'/'+file,data);manifest.push({file,url,sha256:createHash('sha256').update(data).digest('hex')});console.log('Saved '+file);}
await fs.writeFile(root+'/sources.json',JSON.stringify(manifest,null,2)+'\n');
