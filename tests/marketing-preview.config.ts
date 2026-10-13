import {defineConfig} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
// Real UI, memory-only hooks; never imports main.tsx or constructs a Convex client.
export default defineConfig({
 resolve:{alias:[{find:/^convex\/react$/,replacement:path.resolve('tests/fixtures/marketing-preview-mocks.ts')},{find:/^@convex-dev\/auth\/react$/,replacement:path.resolve('tests/fixtures/marketing-preview-mocks.ts')}]},
 define:{'import.meta.env.VITE_CONVEX_URL':JSON.stringify('http://preview.invalid'),'import.meta.env.VITE_CONVEX_SITE_URL':JSON.stringify('http://127.0.0.1:5176')},
 plugins:[{name:'browser-only-marketing-preview',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const pathname=new URL(req.url??'/','http://localhost').pathname;
  if(pathname==='/__preview-upload'&&req.method==='PUT'){req.resume();req.on('end',()=>{res.statusCode=200;res.end();});return;}
  if(pathname==='/api/marketing/media'){res.setHeader('Content-Type','video/mp4');res.end(await fs.readFile('public/sample.mp4'));return;}
  if(pathname==='/'||/^\/marketing(?:\/|$)/.test(pathname)){const html=await server.transformIndexHtml(pathname,await fs.readFile('tests/fixtures/marketing-preview.html','utf8'));res.setHeader('Content-Type','text/html');res.end(html);return;}
  next();
 });}}]
});
