import type {Id} from '../../convex/_generated/dataModel';
import {readDraft,writeDrafts} from './drafts';

export type PendingVideoUpload={file:File;uploadId?:Id<'marketingUploads'>;uploaded?:boolean};
type Storage={read:<T>(key:string)=>Promise<T|undefined>;write:(entries:[string,unknown][])=>Promise<void>};
type Checkpoint=Omit<PendingVideoUpload,'file'>;

/** Store the large video once; each later upload checkpoint only updates its small status record. */
export class VideoUploadRecovery{
 private sameFile?:File;
 private tail:Promise<void>=Promise.resolve();
 constructor(private key:string,private storage:Storage={read:readDraft,write:writeDrafts}){}
 private get fileKey(){return `${this.key}:file`;}
 private ordered<T>(operation:()=>Promise<T>):Promise<T>{
  const result=this.tail.then(operation);
  // A failed checkpoint must not prevent a retry or a later clear.
  this.tail=result.then(()=>{},()=>{});
  return result;
 }
 read():Promise<PendingVideoUpload|undefined>{return this.ordered(async()=>{
  this.sameFile=undefined;
  const state=await this.storage.read<PendingVideoUpload|Checkpoint>(this.key);
  if(!state)return undefined;
  // Old drafts contain the File directly. Migrate at the next save, not during recovery.
  if('file' in state)return state;
  const file=await this.storage.read<File>(this.fileKey);
  if(!file)return undefined;
  this.sameFile=file;
  return {...state,file};
 });}
 save(value:PendingVideoUpload):Promise<void>{
  const file=value.file,checkpoint:Checkpoint={uploadId:value.uploadId,uploaded:value.uploaded};
  return this.ordered(async()=>{
   const entries:[string,unknown][]=[];
   if(file!==this.sameFile)entries.push([this.fileKey,file]);
   entries.push([this.key,checkpoint]);
   // The first file and checkpoint commit together. Only remember it after the commit succeeds.
   await this.storage.write(entries);
   this.sameFile=file;
  });
 }
 clear():Promise<void>{return this.ordered(async()=>{
  await this.storage.write([[this.key,undefined],[this.fileKey,undefined]]);
  this.sameFile=undefined;
 });}
}
