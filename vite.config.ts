import {defineConfig} from 'vite';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
// Mask suggestions deliberately use CPU/WASM in a worker. Exclude GPU binaries
// so every hosted asset remains below Cloudflare Pages' per-file limit.
export default defineConfig({plugins:[{name:'local-marketing-preview-upload',configureServer(server){
 if(process.env.VITE_CONVEX_URL!=='http://127.0.0.1:3210')return;
 server.middlewares.use('/__marketing-preview-upload',async(req,res)=>{
  try{const target=new URL(new URL(req.url!,'http://localhost').searchParams.get('url')??'');
   if(req.method!=='PUT'||target.protocol!=='https:'||!target.hostname.endsWith('.r2.cloudflarestorage.com')||!target.pathname.startsWith('/marketing/staging/')||!target.searchParams.has('X-Amz-Signature')){res.statusCode=403;res.end('Invalid preview upload.');return;}
   const response=await fetch(target,{method:'PUT',headers:{'Content-Type':String(req.headers['content-type']??''),'Content-Length':String(req.headers['content-length']??'0')},body:req as any,duplex:'half'} as any);
   res.statusCode=response.status;if(response.body)await pipeline(Readable.fromWeb(response.body as any),res);else res.end();
  }catch{res.statusCode=502;res.end('Preview upload failed. Retry your upload.');}
 });
}}],resolve:{alias:[{find:'onnxruntime-web/webgpu',replacement:'onnxruntime-web/wasm'}]}});
