import {defineConfig} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {feedbackSampleMedia} from '../src/marketing/sample-media';
const uploads=new Map<string,{body:Buffer;mime:string}>();
// Real UI, memory-only hooks; never imports main.tsx or constructs a Convex client.
export default defineConfig({
 resolve:{alias:[{find:/^convex\/react$/,replacement:path.resolve('tests/fixtures/marketing-preview-mocks.ts')},{find:/^@convex-dev\/auth\/react$/,replacement:path.resolve('tests/fixtures/marketing-preview-mocks.ts')}]},
 define:{'import.meta.env.VITE_CONVEX_URL':JSON.stringify('http://preview.invalid'),'import.meta.env.VITE_CONVEX_SITE_URL':JSON.stringify('http://127.0.0.1:5176')},
 plugins:[{name:'browser-only-marketing-preview',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const pathname=new URL(req.url??'/','http://localhost').pathname;
  if(pathname==='/__preview-upload'&&req.method==='PUT'){const chunks:Buffer[]=[];req.on('data',chunk=>chunks.push(Buffer.from(chunk)));req.on('end',()=>{const id=new URL(req.url??'/','http://localhost').searchParams.get('id');if(id)uploads.set(id,{body:Buffer.concat(chunks),mime:String(req.headers['content-type']??'application/octet-stream')});res.statusCode=200;res.end();});return;}
  if(pathname==='/api/marketing/media'){const id=new URL(req.url??'/','http://localhost').searchParams.get('asset'),asset=id?uploads.get(id):null,body=asset?.body??await fs.readFile('public'+feedbackSampleMedia.src);res.setHeader('Content-Type',asset?.mime??'video/mp4');res.setHeader('Accept-Ranges','bytes');const range=/^bytes=(\d+)-(\d*)$/.exec(String(req.headers.range??''));if(range){const start=Number(range[1]),end=Math.min(body.length-1,range[2]?Number(range[2]):body.length-1);if(start>=body.length){res.statusCode=416;res.setHeader('Content-Range',`bytes */${body.length}`);res.end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${body.length}`);res.setHeader('Content-Length',end-start+1);res.end(body.subarray(start,end+1));}else{res.setHeader('Content-Length',body.length);res.end(body);}return;}
  if(pathname==='/'||/^\/(?:marketing|video-feedback)(?:\/|$)/.test(pathname)){const html=await server.transformIndexHtml(pathname,await fs.readFile('tests/fixtures/marketing-preview.html','utf8'));res.setHeader('Content-Type','text/html');res.end(html);return;}
  next();
 });}}]
});
