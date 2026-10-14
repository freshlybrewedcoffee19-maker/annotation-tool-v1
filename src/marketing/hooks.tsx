import {createContext,useContext,useCallback,useSyncExternalStore,type ReactNode} from 'react';
import {useQuery as query,useMutation as mutation,useAction as action} from 'convex/react';
import {getFunctionName} from 'convex/server';
import type {CardData} from './types';

// A sample provider is fixed for its mounted lifetime. Its hooks never contact Convex.
class SampleStore {
 id=crypto.randomUUID();revision=0;listeners=new Set<()=>void>();audio=new Map<string,string>();uploads=new Map<string,any>();
 data:CardData={card:{id:'sample',title:'Try video feedback',status:'needs_feedback',latestVersionId:'sample-version',approvedVersionId:null,finalised:false,cleaning:false},owner:true,versions:[{id:'sample-version',number:1,name:'Sample video',size:0,duration:5.05,width:960,height:540,uploadedAt:Date.now(),uploader:'You (sample)',deleted:false}],feedback:[],replies:[],events:[],access:[],links:[]};
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};snapshot=()=>this.revision;
 update(){this.revision++;this.listeners.forEach(fn=>fn());}
 async call(name:string,args:any){switch(name){
 case 'marketing:saveFeedback':{
  const version=this.data.versions.find(row=>row.id===args.versionId);
  if(!version||(version.deleted&&!args.feedbackId))throw Error('This video version is unavailable.');
  if(!Number.isFinite(args.start)||!Number.isFinite(args.end)||args.start<0||args.end<=args.start||args.end>version.duration+.05)throw Error('Mark a valid start and stop within this version.');
  const old=args.feedbackId?this.data.feedback.find(row=>row.id===args.feedbackId):this.data.feedback.find(row=>row.clientKey===args.clientKey);
  if(args.feedbackId&&!old)throw Error('Feedback not found.');
  if(old&&old.versionId!==version.id)throw Error('Feedback belongs to a different version.');
  if(old&&version.deleted&&(args.start!==old.start||args.end!==old.end))throw Error('Deleted footage timing cannot be changed.');
  if(old){if(args.feedbackId)Object.assign(old,{text:args.text,start:args.start,end:args.end});return old.id;}
  const id=crypto.randomUUID();this.data.feedback.push({id,versionId:args.versionId,start:args.start,end:args.end,text:args.text,audioId:args.audioId??null,author:'You (sample)',canEdit:true,createdAt:Date.now(),reviewed:false,clientKey:args.clientKey});return id;
 }
 case 'marketing:reviewFeedback':{const row=this.data.feedback.find(f=>f.id===args.feedbackId);if(row)row.reviewed=args.reviewed;return null;}
 case 'marketing:reply':this.data.replies.push({id:crypto.randomUUID(),feedbackId:args.feedbackId,text:args.text,author:'You (sample)',createdAt:Date.now()});return null;
 case 'marketingFiles:begin':{const id=crypto.randomUUID();this.uploads.set(id,args);return {uploadId:id,url:'sample-upload:'+id};}
 case 'marketingFiles:complete':return {audioId:args.uploadId};
 default:throw Error('This sample only saves practice feedback in this tab. Upload your own video from the marketing homepage.');
 }}
}
const SampleContext=createContext<SampleStore|null>(null);
export function SampleProvider({store,children}:{store:SampleStore;children:ReactNode}){return <SampleContext.Provider value={store}>{children}</SampleContext.Provider>;}
export const createSample=()=>new SampleStore();
export function useSample(){return useContext(SampleContext);}
const noSubscription=()=>()=>{};
const zero=()=>0;
export function useQuery(...args:Parameters<typeof query>):any{
 const sample=useSample(),live=query(args[0],sample?'skip':args[1]);
 useSyncExternalStore(sample?.subscribe??noSubscription,sample?.snapshot??zero);
 if(!sample)return live;if(args[1]==='skip')return undefined;const name=getFunctionName(args[0]);
 if(name==='accounts:me')return {email:'sample',name:'You'};if(name==='marketing:detail')return sample.data;throw Error('Private data is unavailable in the sample.');
}
export function useMutation(...args:Parameters<typeof mutation>):any{
 const sample=useSample(),live=mutation(...args),name=getFunctionName(args[0]);
 return useCallback(async(params:any)=>{if(!sample)return live(params);const value=await sample.call(name,params);sample.update();return value;},[sample,live,name]);
}
export function useAction(...args:Parameters<typeof action>):any{
 const sample=useSample(),live=action(...args),name=getFunctionName(args[0]);
 return useCallback(async(params:any)=>{if(!sample)return live(params);const value=await sample.call(name,params);sample.update();return value;},[sample,live,name]);
}
