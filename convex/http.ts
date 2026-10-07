import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
import {auth} from './auth';
const http=httpRouter();
auth.addHttpRoutes(http);
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

