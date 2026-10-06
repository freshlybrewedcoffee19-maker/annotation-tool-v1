import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
import {auth} from './auth';
const http=httpRouter();
auth.addHttpRoutes(http);
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,X-Workspace-Token,Authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
http.route({path:'/api/upload',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers}))});
http.route({path:'/api/upload',method:'POST',handler:httpAction(async(ctx,request)=>{
 try{const workspaceId=await ctx.runQuery(internal.workspaces.check,{workspaceToken:request.headers.get('X-Workspace-Token')??''});
 const blob=await request.blob();if(!['video/mp4','video/webm','video/quicktime'].includes(blob.type))return new Response('Choose an MP4, MOV or WebM.',{status:400,headers});
 const storageId=await ctx.storage.store(blob);await ctx.runMutation(internal.workspaces.recordFile,{workspaceId,storageId});return Response.json({storageId},{headers});
 }catch{return new Response('Upload unavailable for this workspace.',{status:403,headers});}
})});
// Auth routes take precedence over this fallback. Backend paths must stay here.
http.route({pathPrefix:'/',method:'GET',handler:httpAction(async(_ctx,request)=>{
 const url=new URL(request.url);
 if(url.pathname==='/api'||url.pathname.startsWith('/api/')||url.pathname==='/.well-known'||url.pathname.startsWith('/.well-known/')||url.pathname==='/.files'||url.pathname.startsWith('/.files/')){
  return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 }
 return new Response(null,{status:308,headers:{Location:`https://cheddarvox.com${url.pathname}${url.search}`,'Cache-Control':'no-store'}});
})});
export default http;
