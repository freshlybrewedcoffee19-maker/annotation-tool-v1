// Browser memory only. No client, credentials, users or backend network calls.
import {useCallback,useSyncExternalStore} from 'react';
import {getFunctionName} from 'convex/server';
let revision=0;
const listeners=new Set<()=>void>(),pending=new Map<string,any>();
let card:any=null,versions:any[]=[],feedback:any[]=[],replies:any[]=[],links:any[]=[],events:any[]=[];
// Optional example is display data in this tab, not an account or database seed.
if(new URLSearchParams(location.search).has('example')){
 const id='example-version';card={id:'preview-video',title:'Example video',status:'changes_requested',latestVersionId:id,approvedVersionId:null,finalised:false,cleaning:false};
 versions=[{id,number:1,name:'sample.mp4',size:1128375,duration:5.05,width:960,height:540,uploadedAt:Date.now(),uploader:'Preview',deleted:false}];
 feedback=[{id:'example-feedback',versionId:id,start:1,end:3,text:'Shorten the opening.',audioId:null,author:'Preview',createdAt:Date.now(),reviewed:false}];
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const snapshot=()=>revision;
function update(){revision++;listeners.forEach(fn=>fn());}
function event(text:string){events.unshift({id:crypto.randomUUID(),text,author:'Preview',createdAt:Date.now()});}
export function useConvexAuth(){return {isLoading:false,isAuthenticated:true};}
export function useAuthActions(){return {signOut:async()=>{},signIn:async()=>{throw Error('Sign-in is disabled in this browser-only preview.');}};}
export function useQuery(reference:any,args:any){useSyncExternalStore(subscribe,snapshot);if(args==='skip')return undefined;switch(getFunctionName(reference)){
 case 'accounts:me':return {name:'Preview',email:''};
 case 'accounts:providers':return {googleAvailable:false,passwordRecoveryAvailable:false};
 case 'marketing:board':return card?[{...card,owner:true,updatedAt:Date.now()}]:[];
 case 'marketing:storageUsage':return versions.reduce((total,v)=>total+v.size,0);
 case 'marketing:detail':case 'marketing:publicReview':if(!card)throw Error('Upload a video to start.');return {card,owner:getFunctionName(reference)==='marketing:detail',versions,feedback,replies,links,events,access:[]};
 default:throw Error('Unexpected preview query: '+getFunctionName(reference));
}}
export function useMutation(reference:any){const name=getFunctionName(reference);return useCallback(async(args:any)=>{
 let result:any=null;
 switch(name){
 case 'marketing:mediaTicket':break;
 case 'marketing:status':card={...card,status:args.status,approvedVersionId:args.status==='approved'?card.latestVersionId:null};event(args.status==='approved'?'Marked this video done.':'Continued feedback.');break;
 case 'marketing:saveFeedback':if(args.feedbackId){feedback=feedback.map(f=>f.id===args.feedbackId?{...f,text:args.text}:f);break;}result=crypto.randomUUID();feedback=[...feedback,{id:result,versionId:args.versionId,start:args.start,end:args.end,text:args.text,audioId:null,author:'Preview',createdAt:Date.now(),reviewed:false}];card={...card,status:'changes_requested',approvedVersionId:null};event('Added feedback.');break;
 case 'marketing:reply':replies=[...replies,{id:crypto.randomUUID(),feedbackId:args.feedbackId,text:args.text,author:'Preview',createdAt:Date.now()}];break;
 case 'marketing:share':result=crypto.randomUUID();links=[...links,{id:result,token:args.token,revoked:false}];break;
 case 'marketing:revoke':links=links.map(link=>link.id===args.linkId?{...link,revoked:true}:link);break;
 case 'marketingFiles:begin':result={uploadId:crypto.randomUUID(),url:'/__preview-upload'};pending.set(result.uploadId,args);break;
 case 'marketingFiles:resume':result='/__preview-upload';break;
 case 'marketingFiles:complete':{const upload=pending.get(args.uploadId);if(!upload)throw Error('Preview upload not found.');const id=crypto.randomUUID();versions=[...versions,{id,number:versions.length+1,name:upload.name,size:upload.size,duration:upload.duration,width:upload.width,height:upload.height,uploadedAt:Date.now(),uploader:'Preview',deleted:false}];card={id:'preview-video',title:card?.title??upload.title,status:versions.length>1?'revised':'needs_feedback',latestVersionId:id,approvedVersionId:null,finalised:false,cleaning:false};event('Uploaded version '+versions.length+'.');result={cardId:card.id,versionId:id,audioId:null};break;}
 default:throw Error('This action is not connected in the browser-only preview: '+name);
 }
 update();return result;
 },[name]);}
export const useAction=useMutation;
// The legacy player imports annotation helpers, but marketing never calls them.
export function useConvex(){throw Error('Annotation backend access is unavailable in the marketing preview.');}
