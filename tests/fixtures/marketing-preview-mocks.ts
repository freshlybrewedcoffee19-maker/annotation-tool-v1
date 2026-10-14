// Browser memory only. No client, credentials, users or backend network calls.
import {useCallback,useSyncExternalStore} from 'react';
import {getFunctionName} from 'convex/server';
import {feedbackSampleMedia} from '../../src/marketing/sample-media';
let authenticated=!new URLSearchParams(location.search).has('signedout');
let accountReady=!new URLSearchParams(location.search).has('delayAccount');
let revision=0;
const listeners=new Set<()=>void>(),pending=new Map<string,any>();
let card:any=null,versions:any[]=[],feedback:any[]=[],replies:any[]=[],links:any[]=[],events:any[]=[],access:any[]=[];
let storageRequest:any=null,storageRequestFailures=0;
const previewParams=new URLSearchParams(location.search);
const stressPreview=previewParams.get('example')==='1'&&previewParams.get('stress')==='1';
const stressTitles=[
 'Preview project — Autumn launch campaign, regional adaptations and the complete final creative review for every placement',
 'Preview project — Product introduction',
 'Preview project — Customer story, vertical cut',
 'Preview project — Approved launch announcement',
 'Preview project — Retargeting edits for the new collection',
 'Preview project — Social teaser',
 'Preview project — A very long deliverable filename with multiple revisions and detailed notes from the creative team',
 'Preview project — Final presentation',
];
const stressComments=[
 'Shorten the opening and bring the product into frame before the headline appears.',
 'Keep the voiceover, but reduce the music here so every word remains easy to hear.',
 'Please replace this shot with the revised product footage from the latest brief.',
 'This transition works. Keep the timing when preparing the next version.',
 'Move the offer higher so the caption area stays clear on a narrow phone screen.',
 'The logo disappears too quickly. Give the final frame a little more time.',
 'Use a closer crop for the square placement, with the full product still visible.',
 'Please check the subtitle spelling and the contrast against this bright background.',
 'The new pacing is approved; retain this sequence for the final export.',
 'Match the closing colour to the opening shot and keep the final call to action visible.',
];
// Optional example is display data in this tab, not an account or database seed.
if(new URLSearchParams(location.search).has('example')){
 const id='example-version';card={id:'preview-video',title:'Example video',status:'changes_requested',latestVersionId:id,approvedVersionId:null,finalised:false,cleaning:false};
 versions=[{id,number:1,name:feedbackSampleMedia.name,size:feedbackSampleMedia.size,duration:feedbackSampleMedia.duration,width:feedbackSampleMedia.width,height:feedbackSampleMedia.height,uploadedAt:Date.now(),uploader:'Preview',deleted:false}];
 feedback=[{id:'example-feedback',versionId:id,start:1,end:3,text:'Shorten the opening.',audioId:null,author:'Preview',createdAt:Date.now(),reviewed:false}];
 if(stressPreview){
  const createdAt=Date.now();
  versions=Array.from({length:3},(_,index)=>({...versions[0],id:index?`${id}-${index+1}`:id,number:index+1,name:`preview-autumn-launch-campaign-regional-adaptations-version-${index+1}.mp4`,uploadedAt:createdAt-(2-index)*86400000}));
  card={...card,title:stressTitles[0],latestVersionId:versions[2].id};
  feedback=stressComments.map((text,index)=>({id:index?`example-feedback-${index+1}`:'example-feedback',versionId:versions[index%3].id,start:Math.round((.2+index*.3)*100)/100,end:Math.round((1.5+index*.3)*100)/100,text,audioId:null,author:index%2?'Preview editor':'Preview owner',createdAt:createdAt-index*60000,reviewed:index%3===0}));
 }
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const snapshot=()=>revision;
function update(){revision++;listeners.forEach(fn=>fn());}
function event(text:string){events.unshift({id:crypto.randomUUID(),text,author:'Preview',createdAt:Date.now()});}
export function useConvexAuth(){useSyncExternalStore(subscribe,snapshot);return {isLoading:false,isAuthenticated:authenticated};}
export function useAuthActions(){return {signOut:async()=>{authenticated=false;update();},signIn:async()=>{authenticated=true;update();return {signingIn:true};}};}
export function useQuery(reference:any,args:any){useSyncExternalStore(subscribe,snapshot);if(args==='skip')return undefined;switch(getFunctionName(reference)){
 case 'accounts:me':if(!accountReady){setTimeout(()=>{accountReady=true;update();},150);return undefined;}return {name:'Preview',email:'preview@example.com'};
 case 'storageRequests:status':return storageRequest;
 case 'accounts:providers':return {googleAvailable:false,passwordRecoveryAvailable:false};
 case 'marketing:board':return card?(stressPreview?stressTitles.map((title,index)=>({...card,id:index?`preview-video-${index+1}`:card.id,title,status:['needs_feedback','changes_requested','revised','approved'][index%4],finalised:index===3,owner:true,updatedAt:Date.now()-index*3600000})):[{...card,owner:true,updatedAt:Date.now()}]):[];
 case 'marketing:storageUsage':return versions.reduce((total,v)=>total+v.size,0);
 case 'marketing:storageQuota':{const stored=new URLSearchParams(location.search).has('storageFull')?1e9:versions.filter(v=>!v.deleted).reduce((total,v)=>total+v.size,0);return {stored,reserved:0,storageLimit:1e9,available:Math.max(0,1e9-stored),owner:true};}
 case 'marketing:finalisationPlan':return {keep:versions.at(-1),remove:versions.slice(0,-1).filter(v=>!v.deleted),reclaimed:versions.slice(0,-1).filter(v=>!v.deleted).reduce((n,v)=>n+v.size,0),snapshot:JSON.stringify(versions.map(v=>v.id))};
 case 'marketing:detail':case 'marketing:publicReview':if(!card)throw Error('Upload a video to start.');{const index=stressPreview&&args?.cardId?.match(/^preview-video-(\d+)$/)?Number(args.cardId.match(/^preview-video-(\d+)$/)[1])-1:0;const shownCard=stressPreview&&stressTitles[index]?{...card,id:args?.cardId??card.id,title:stressTitles[index]}:card;return {card:shownCard,owner:getFunctionName(reference)==='marketing:detail',versions,feedback,replies,links,events,access};}
 default:throw Error('Unexpected preview query: '+getFunctionName(reference));
}}
const heldSaves:(()=>void)[]=[];(window as any).__releaseMarketingSaves=()=>{for(const release of heldSaves.splice(0))release();};
export function useMutation(reference:any){const name=getFunctionName(reference);return useCallback(async(args:any)=>{
 if(name==='marketing:saveFeedback'&&sessionStorage.getItem('preview-hold-saves'))await new Promise<void>(resolve=>heldSaves.push(resolve));
 if(name==='marketing:saveFeedback'&&args.text===sessionStorage.getItem('preview-fail-save-text')){sessionStorage.removeItem('preview-fail-save-text');throw Error('Preview: save failed; original audio and transcript retained.');}
 const fail='preview-fail-'+name;if(sessionStorage.getItem(fail)){sessionStorage.removeItem(fail);throw Error('Preview: temporary failure; retry with your draft retained.');}
 let result:any=null;
 switch(name){
 case 'storageRequests:request':{if(!authenticated)throw Error('Sign in to request extra storage.');if(storageRequest&&(storageRequest.status!=='failed'||storageRequest.retryAt>Date.now())){result=storageRequest;break;}storageRequest={requestId:'preview-storage-request',status:'queued',createdAt:Date.now(),sentAt:null,retryAt:null};result=storageRequest;setTimeout(()=>{const failed=new URLSearchParams(location.search).has('requestFails')&&storageRequestFailures++===0;storageRequest={...storageRequest,status:failed?'failed':'sent',sentAt:failed?null:Date.now(),retryAt:failed?Date.now()+6000:null};update();},1000);break;}
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
