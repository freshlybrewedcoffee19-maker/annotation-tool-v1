import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
const http=httpRouter();
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,X-Workspace-Token','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
http.route({path:'/upload',method:'OPTIONS',handler:httpAction(async()=>new Response(null,{status:204,headers}))});
http.route({path:'/upload',method:'POST',handler:httpAction(async(ctx,request)=>{
 try{const workspaceId=await ctx.runQuery(internal.workspaces.check,{workspaceToken:request.headers.get('X-Workspace-Token')??''});
 const blob=await request.blob();if(!['video/mp4','video/webm','video/quicktime'].includes(blob.type))return new Response('Choose an MP4, MOV or WebM.',{status:400,headers});
 const storageId=await ctx.storage.store(blob);await ctx.runMutation(internal.workspaces.recordFile,{workspaceId,storageId});return Response.json({storageId},{headers});
 }catch{return new Response('Upload unavailable for this workspace.',{status:403,headers});}
})});
export default http;
