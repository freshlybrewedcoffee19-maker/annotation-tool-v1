// Browser memory only. No client, credentials, users or backend network calls.
import {useCallback,useSyncExternalStore} from 'react';
import {getFunctionName} from 'convex/server';
let authenticated=!new URLSearchParams(location.search).has('signedout');
let accountReady=!new URLSearchParams(location.search).has('delayAccount');
let revision=0;
const listeners=new Set<()=>void>(),pending=new Map<string,any>();
let card:any=null,versions:any[]=[],feedback:any[]=[],replies:any[]=[],links:any[]=[],events:any[]=[],access:any[]=[];
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
export function useConvexAuth(){useSyncExternalStore(subscribe,snapshot);return {isLoading:false,isAuthenticated:authenticated};}
export function useAuthActions(){return {signOut:async()=>{authenticated=false;update();},signIn:async()=>{authenticated=true;update();return {signingIn:true};}};}
export function useQuery(reference:any,args:any){useSyncExternalStore(subscribe,snapshot);if(args==='skip')return undefined;switch(getFunctionName(reference)){
 case 'accounts:me':if(!accountReady){setTimeout(()=>{accountReady=true;update();},150);return undefined;}return {name:'Preview',email:''};
 case 'accounts:providers':return {googleAvailable:false,passwordRecoveryAvailable:false};
 case 'marketing:board':return card?[{...card,owner:true,updatedAt:Date.now()}]:[];
 case 'marketing:storageUsage':return versions.reduce((total,v)=>total+v.size,0);
 case 'marketing:storageQuota':{const stored=new URLSearchParams(location.search).has('storageFull')?1e9:versions.filter(v=>!v.deleted).reduce((total,v)=>total+v.size,0);return {stored,reserved:0,storageLimit:1e9,available:Math.max(0,1e9-stored),owner:true};}
 case 'marketing:finalisationPlan':return {keep:versions.at(-1),remove:versions.slice(0,-1).filter(v=>!v.deleted),reclaimed:versions.slice(0,-1).filter(v=>!v.deleted).reduce((n,v)=>n+v.size,0),snapshot:JSON.stringify(versions.map(v=>v.id))};
 case 'marketing:detail':case 'marketing:publicReview':if(!card)throw Error('Upload a video to start.');return {card,owner:getFunctionName(reference)==='marketing:detail',versions,feedback,replies,links,events,access};
 default:throw Error('Unexpected preview query: '+getFunctionName(reference));
}}
const heldSaves:(()=>void)[]=[];(window as any).__releaseMarketingSaves=()=>{for(const release of heldSaves.splice(0))release();};
export function useMutation(reference:any){const name=getFunctionName(reference);return useCallback(async(args:any)=>{
 if(name==='marketing:saveFeedback'&&sessionStorage.getItem('preview-hold-saves'))await new Promise<void>(resolve=>heldSaves.push(resolve));
 if(name==='marketing:saveFeedback'&&args.text===sessionStorage.getItem('preview-fail-save-text')){sessionStorage.removeItem('preview-fail-save-text');throw Error('Preview: save failed; original audio and transcript retained.');}
 const fail='preview-fail-'+name;if(sessionStorage.getItem(fail)){sessionStorage.removeItem(fail);throw Error('Preview: temporary failure; retry with your draft retained.');}
 let result:any=null;
 switch(name){
 case 'marketing:mediaTicket':break;
 case 'marketing:cancelUpload':pending.delete(args.uploadId);break;
 case 'marketing:reopen':card={...card,finalised:false,status:'needs_feedback',approvedVersionId:null};event('Reopened the card for revisions.');break;
 case 'marketingFiles:finalise':if(!args.confirmed)throw Error('Explicit confirmation required.');versions=versions.map((v,i)=>({...v,deleted:i<versions.length-1}));card={...card,finalised:true};event('Finalised the card. Latest video and all feedback retained.');break;
 case 'marketing:reviewFeedback':feedback=feedback.map(f=>f.id===args.feedbackId?{...f,reviewed:args.reviewed}:f);break;
 case 'marketing:status':card={...card,status:args.status,approvedVersionId:args.status==='approved'?card.latestVersionId:null};event(args.status==='approved'?'Marked this video done.':'Continued feedback.');break;
 case 'marketing:saveFeedback':{
  const version=versions.find(row=>row.id===args.versionId);
  if(!version||(version.deleted&&!args.feedbackId))throw Error('This video version is unavailable.');
  if(!Number.isFinite(args.start)||!Number.isFinite(args.end)||args.start<0||args.end<=args.start||args.end>version.duration+.05)throw Error('Mark a valid start and stop within this version.');
  const old=args.feedbackId?feedback.find(row=>row.id===args.feedbackId):feedback.find(row=>row.clientKey===args.clientKey);
  if(args.feedbackId&&!old)throw Error('Feedback not found.');
  if(old&&old.versionId!==version.id)throw Error('Feedback belongs to a different version.');
  if(old&&version.deleted&&(args.start!==old.start||args.end!==old.end))throw Error('Deleted footage timing cannot be changed.');
  if(old){if(args.feedbackId)feedback=feedback.map(row=>row.id===old.id?{...row,text:args.text,start:args.start,end:args.end}:row);result=old.id;break;}
  result=crypto.randomUUID();feedback=[...feedback,{id:result,versionId:args.versionId,start:args.start,end:args.end,text:args.text,audioId:args.audioId??null,clientKey:args.clientKey,author:'Preview',createdAt:Date.now(),reviewed:false}];card={...card,status:'changes_requested',approvedVersionId:null};event('Added feedback.');break;
 }
 case 'marketing:reply':replies=[...replies,{id:crypto.randomUUID(),feedbackId:args.feedbackId,text:args.text,author:'Preview',createdAt:Date.now()}];break;
 case 'marketing:invite':access=[...access.filter(grant=>grant.email!==args.email),{id:crypto.randomUUID(),email:args.email,token:args.token,status:'invited'}];event('Created an editor invitation.');break;
 case 'marketing:decideAccess':access=access.map(grant=>grant.id===args.accessId?{...grant,status:args.decision}:grant);break;
 case 'marketing:requestAccess':event('Requested editor access.');break;
 case 'marketing:share':result=crypto.randomUUID();links=[...links,{id:result,token:args.token,revoked:false}];break;
 case 'marketing:revoke':links=links.map(link=>link.id===args.linkId?{...link,revoked:true}:link);break;
 case 'marketingFiles:begin':result={uploadId:crypto.randomUUID(),url:''};result.url='/__preview-upload?id='+result.uploadId;pending.set(result.uploadId,args);break;
 case 'marketingFiles:resume':result='/__preview-upload?id='+args.uploadId;break;
 case 'marketingFiles:complete':{const upload=pending.get(args.uploadId);if(!upload)throw Error('Preview upload not found.');if(upload.kind==='audio'){result={cardId:upload.cardId,versionId:upload.versionId,audioId:args.uploadId};break;}const id=args.uploadId;if(versions.some(v=>v.id===id)){result={cardId:card.id,versionId:id,audioId:null};break;}versions=[...versions,{id,number:versions.length+1,name:upload.name,size:upload.size,duration:upload.duration,width:upload.width,height:upload.height,uploadedAt:Date.now(),uploader:'Preview',deleted:false}];card={id:'preview-video',title:card?.title??upload.title,status:versions.length>1?'revised':'needs_feedback',latestVersionId:id,approvedVersionId:null,finalised:false,cleaning:false};event('Uploaded version '+versions.length+'.');result={cardId:card.id,versionId:id,audioId:null};break;}
 default:throw Error('This action is not connected in the browser-only preview: '+name);
 }
 update();return result;
 },[name]);}
export const useAction=useMutation;
// The legacy player imports annotation helpers, but marketing never calls them.
export function useConvex(){throw Error('Annotation backend access is unavailable in the marketing preview.');}
