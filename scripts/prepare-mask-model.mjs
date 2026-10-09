import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const revision='5850ab45f587c112167512ffef949107115e26a0';
const files={
 'config.json':'6339884f168658d3ca6473b486973913fb33e84e625e06ae2dd7b4a808187419',
 'preprocessor_config.json':'225545a743c654e3c495ec6f545a0eaba57c8ba3fbbd8483b3cb1c0fc58db517',
 'onnx/vision_encoder.onnx':'9f8433273a6750b587779baa0cf5508111001bf7e7acfcf585d370139fd366d0',
 'onnx/prompt_encoder_mask_decoder.onnx':'f4514391764fbd56e08e119060d874ecd7d52994bfb1968af159e12d4943b5bb',
};
const hash=data=>createHash('sha256').update(data).digest('hex');
for(const [file,expected] of Object.entries(files)){
 const target=path.join(root,'public/mask-model/slimsam-77-5850ab4',file);let data;
 for(const candidate of [target,path.join(root,'benchmarks/detection/.cache/Xenova/slimsam-77-uniform',file)]){try{const cached=await readFile(candidate);if(hash(cached)===expected){data=cached;break;}}catch{}}
 if(!data){const response=await fetch(`https://huggingface.co/Xenova/slimsam-77-uniform/resolve/${revision}/${file}`,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`Model download failed: ${file}`);data=Buffer.from(await response.arrayBuffer());}
 if(hash(data)!==expected)throw Error(`Model checksum mismatch: ${file}`);
 await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);
}
const runtime=path.join(root,'public/mask-model/runtime-4.3.1');await mkdir(runtime,{recursive:true});
for(const file of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])await copyFile(path.join(root,'node_modules/onnxruntime-web/dist',file),path.join(runtime,file));
await copyFile(path.join(root,'node_modules/@huggingface/transformers/LICENSE'),path.join(root,'public/mask-model/Apache-2.0.txt'));
await copyFile(path.join(root,'scripts/ONNX-RUNTIME-LICENSE.txt'),path.join(root,'public/mask-model/ONNX-RUNTIME-LICENSE.txt'));
await writeFile(path.join(root,'public/mask-model/NOTICE.txt'),'SlimSAM: Xenova/slimsam-77-uniform, Apache-2.0, revision '+revision+'\nhttps://huggingface.co/Xenova/slimsam-77-uniform\nTransformers.js 4.3.1: Apache-2.0. ONNX Runtime: MIT.\n');
console.log('Pinned browser mask model ready (about 55 MB, downloaded only when requested).');
