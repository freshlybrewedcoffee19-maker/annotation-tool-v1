import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep))throw Error('Outside benchmark');
  const data=await fs.readFile(file);
  const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.wasm':'application/wasm','.json':'application/json','.mp4':'video/mp4'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Missing benchmark file');}
}).listen(5185,'127.0.0.1',()=>console.log('Benchmark http://127.0.0.1:5185'));
