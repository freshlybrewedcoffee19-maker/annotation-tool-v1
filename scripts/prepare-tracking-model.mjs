import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),revision='248663fde6bf7c40190cf10ee396d5662919ecd3';
const target=path.join(root,'public/tracking-model/nanotrack-v3-248663f');await mkdir(target,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files={backbone:{hash:'50be1320abf9384fd3479ea829f95e244cf3f3838190c5ab60c750fb8c1ce828',source:'nanotrack_backbone.onnx'},head:{hash:'75357903be3f4817c965af16cb5a11fd32b1467f597a408405a98635ac63f61d',source:'nanotrack_head.onnx'}};
for(const [name,info] of Object.entries(files)){
 let data;for(const candidate of [path.join(target,name+'.onnx'),path.join(root,'benchmarks/nanotrack',name+'.onnx')]){try{const b=await readFile(candidate);if(hash(b)===info.hash){data=b;break;}}catch{}}
 if(!data){const response=await fetch('https://raw.githubusercontent.com/HonglinChu/SiamTrackers/'+revision+'/NanoTrack/models/nanotrackv3/'+info.source,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Tracking model download failed.');data=Buffer.from(await response.arrayBuffer());}
 if(hash(data)!==info.hash)throw Error('Tracking model checksum mismatch.');await writeFile(path.join(target,name+'.onnx'),data);
}
// Rewrite only declared template shapes using protobuf fields. Weights and operators are unchanged.
function varint(n){const bytes=[];do{let b=n%128;n=Math.floor(n/128);if(n)b|=128;bytes.push(b);}while(n);return Buffer.from(bytes);}
function rewrite(data,route,change){let offset=0;const chunks=[];const read=()=>{let n=0,m=1,b;do{b=data[offset++];n+=(b&127)*m;m*=128;}while(b&128);return n;};while(offset<data.length){const start=offset,key=read(),field=Math.floor(key/8),wire=key%8;if(wire===2){const length=read(),body=data.subarray(offset,offset+length);offset+=length;if(field===route[0]){const next=route.length===1?change(body):rewrite(body,route.slice(1),change);chunks.push(varint(key),varint(next.length),next);continue;}}else if(wire===0)read();else if(wire===5)offset+=4;else if(wire===1)offset+=8;else throw Error('Unsupported model field.');chunks.push(data.subarray(start,offset));}return Buffer.concat(chunks);}
// The shape declarations are fixed and checksum verified; replace the exact original tail and graph size.
const original=await readFile(path.join(target,'backbone.onnx'));
const oldTail=Buffer.from('5a210a05696e70757412180a16080112120a0208010a0208030a0308ff010a0308ff0162200a066f757470757412160a14080112100a0208010a0208600a0208100a020810','hex');
const newTail=Buffer.from('5a1f0a05696e70757412160a14080112100a0208010a0208030a02087f0a02087f62200a066f757470757412160a14080112100a0208010a0208600a0208080a020808','hex');
const template=rewrite(original,[7],graph=>{const i=graph.indexOf(oldTail);if(i<0||graph.indexOf(oldTail,i+1)>=0)throw Error('Template shape declaration changed.');return Buffer.concat([graph.subarray(0,i),newTail,graph.subarray(i+oldTail.length)]);});
if(hash(template)!=='d81e444720be56f23b9df71df2a902307bef8d41ef7a9663b4cd97040c134da4')throw Error('Derived template checksum mismatch.');
await writeFile(path.join(target,'template.onnx'),template);await copyFile(path.join(root,'scripts/NANOTRACK-LICENSE.txt'),path.join(target,'LICENSE.txt'));
await writeFile(path.join(target,'NOTICE.txt'),'NanoTrack V3, Apache-2.0. Upstream '+revision+'\nhttps://github.com/HonglinChu/SiamTrackers/tree/'+revision+'/NanoTrack\nTemplate input shape repaired; model weights unchanged.\n');
console.log('Pinned tracking models ready (4 MB).');
