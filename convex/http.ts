import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
import {auth} from './auth';
const http=httpRouter();
auth.addHttpRoutes(http);
// Every range request rechecks the review link or the signed-in card membership.
http.route({path:'/api/marketing/media',method:'GET',handler:httpAction(async(ctx,request)=>{
 const url=new URL(request.url);const token=url.searchParams.get('token')??'',assetId=url.searchParams.get('asset')??'',publicLink=url.searchParams.get('public')==='1';
 const mediaHeaders={'Cache-Control':'no-store, private','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
 try{const signed=await ctx.runAction(internal.marketingFiles.streamUrl,{token,assetId,publicLink});const range=request.headers.get('range');const upstream=await fetch(signed,{headers:range?{Range:range}:{}});const responseHeaders=new Headers(mediaHeaders);for(const key of ['content-type','content-length','content-range','accept-ranges']){const value=upstream.headers.get(key);if(value)responseHeaders.set(key,value);}return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});}catch{return new Response('Video or recording unavailable. Reopen the card or ask for a new review link.',{status:403,headers:mediaHeaders});}
})});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,X-Workspace-Token,Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
http.route({path:'/api/upload',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers}))});
// Old clients must refresh; new uploads use account-authorized R2 reservations.
http.route({path:'/api/upload',method:'POST',handler:httpAction(async()=>new Response('Refresh Cheddar Vox and sign in to upload private videos.',{status:410,headers}))});
// Auth routes take precedence over this fallback. Backend paths must stay here.
http.route({pathPrefix:'/',method:'GET',handler:httpAction(async(_ctx,request)=>{
 const url=new URL(request.url);
 if(url.pathname==='/api'||url.pathname.startsWith('/api/')||url.pathname==='/.well-known'||url.pathname.startsWith('/.well-known/')||url.pathname==='/.files'||url.pathname.startsWith('/.files/')){
  return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 }
 return new Response(null,{status:308,headers:{Location:`https://cheddarvox.com${url.pathname}${url.search}`,'Cache-Control':'no-store'}});
})});
export default http;

