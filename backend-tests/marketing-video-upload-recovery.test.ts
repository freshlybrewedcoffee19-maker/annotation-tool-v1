import {test,expect,vi} from 'vitest';
import {VideoUploadRecovery,type PendingVideoUpload} from '../src/marketing/video-upload-recovery';

const key='upload:owner@example.test:new',fileKey=`${key}:file`;
const file=()=>new File(['video bytes'],'launch.mp4',{type:'video/mp4'});
const uploadId='upload-1' as NonNullable<PendingVideoUpload['uploadId']>;
function memory(){
 const rows=new Map<string,unknown>();
 let fail=false;
 const write=vi.fn(async(entries:[string,unknown][])=>{
  if(fail){fail=false;throw Error('Recovery storage unavailable');}
  for(const [key,value] of entries){if(value===undefined)rows.delete(key);else rows.set(key,value);}
 });
 return {rows,write,read:async<T>(key:string)=>rows.get(key) as T|undefined,failNext:()=>{fail=true;}};
}

test('video bytes are stored once while upload checkpoints remain small',async()=>{
 const storage=memory(),recovery=new VideoUploadRecovery(key,storage),video=file();
 await recovery.save({file:video});
 await recovery.save({file:video,uploadId});
 await recovery.save({file:video,uploadId,uploaded:true});
 expect(storage.write.mock.calls[0][0].map(([key])=>key).sort()).toEqual([fileKey,key].sort());
 expect(storage.write.mock.calls.flatMap(([entries])=>entries).filter(([key,value])=>key===fileKey&&value!==undefined)).toEqual([[fileKey,video]]);
 expect(storage.rows.get(key)).toEqual({uploadId,uploaded:true});
 expect(storage.rows.get(fileKey)).toBe(video);
 expect(await recovery.read()).toEqual({file:video,uploadId,uploaded:true});
});

test('a reloaded upload recovers the file and updates metadata without writing video bytes again',async()=>{
 const storage=memory(),video=file();
 storage.rows.set(fileKey,video);storage.rows.set(key,{uploadId});
 const recovery=new VideoUploadRecovery(key,storage),restored=await recovery.read();
 expect(restored).toEqual({file:video,uploadId});
 await recovery.save({...restored!,uploaded:true});
 expect(storage.write).toHaveBeenCalledWith([[key,{uploadId,uploaded:true}]]);
});

test('legacy whole-file drafts stay readable and migrate atomically at their next checkpoint',async()=>{
 const storage=memory(),video=file(),legacy={file:video,uploadId};storage.rows.set(key,legacy);
 const recovery=new VideoUploadRecovery(key,storage);
 expect(await recovery.read()).toEqual(legacy);expect(storage.write).not.toHaveBeenCalled();
 await recovery.save({...legacy,uploaded:true});
 expect(storage.write).toHaveBeenCalledTimes(1);
 expect(storage.write.mock.calls[0][0]).toHaveLength(2);
 expect(storage.rows.get(key)).toEqual({uploadId,uploaded:true});expect(storage.rows.get(fileKey)).toBe(video);
 expect(await new VideoUploadRecovery(key,storage).read()).toEqual({...legacy,uploaded:true});
});

test('failed first storage writes retry the file and checkpoint together',async()=>{
 const storage=memory(),recovery=new VideoUploadRecovery(key,storage),value={file:file(),uploadId};storage.failNext();
 await expect(recovery.save(value)).rejects.toThrow('Recovery storage unavailable');expect(storage.rows.size).toBe(0);
 await recovery.save(value);
 expect(storage.write.mock.calls.map(([entries])=>entries.length)).toEqual([2,2]);
 expect(await new VideoUploadRecovery(key,storage).read()).toEqual(value);
});

test('failed checkpoint writes retain the previous recoverable state and retry without rewriting the file',async()=>{
 const storage=memory(),recovery=new VideoUploadRecovery(key,storage),value={file:file(),uploadId};
 await recovery.save(value);storage.failNext();
 await expect(recovery.save({...value,uploaded:true})).rejects.toThrow('Recovery storage unavailable');
 expect(await new VideoUploadRecovery(key,storage).read()).toEqual(value);
 await recovery.save({...value,uploaded:true});
 expect(storage.write.mock.calls.map(([entries])=>entries.length)).toEqual([2,1,1]);
 expect(await new VideoUploadRecovery(key,storage).read()).toEqual({...value,uploaded:true});
});

test('clear removes both records atomically and a failed clear keeps recovery retryable',async()=>{
 const storage=memory(),recovery=new VideoUploadRecovery(key,storage),value={file:file(),uploadId};
 await recovery.save(value);storage.failNext();
 await expect(recovery.clear()).rejects.toThrow('Recovery storage unavailable');expect(await recovery.read()).toEqual(value);
 await recovery.clear();expect(storage.rows.size).toBe(0);
 expect(storage.write.mock.calls.at(-1)![0]).toEqual([[key,undefined],[fileKey,undefined]]);
 expect(await recovery.read()).toBeUndefined();
 await recovery.save(value);expect(storage.write.mock.calls.at(-1)![0]).toHaveLength(2);
});

test('overlapping checkpoints serialize and snapshot their metadata without repeating the file write',async()=>{
 const storage=memory(),recovery=new VideoUploadRecovery(key,storage),value:PendingVideoUpload={file:file()};
 const initial=recovery.save(value);value.uploadId=uploadId;
 const reserved=recovery.save(value);value.uploaded=true;
 await Promise.all([initial,reserved,recovery.save(value)]);
 const checkpoints=storage.write.mock.calls.flatMap(([entries])=>entries).filter(([entryKey])=>entryKey===key).map(([,value])=>value);
 expect(checkpoints).toEqual([{uploadId:undefined,uploaded:undefined},{uploadId,uploaded:undefined},{uploadId,uploaded:true}]);
 expect(storage.write.mock.calls.map(([entries])=>entries.length)).toEqual([2,1,1]);
});

test('an orphaned file is not offered as an unfinished upload',async()=>{
 const storage=memory();storage.rows.set(fileKey,file());
 expect(await new VideoUploadRecovery(key,storage).read()).toBeUndefined();
 storage.rows.delete(fileKey);storage.rows.set(key,{uploadId});
 expect(await new VideoUploadRecovery(key,storage).read()).toBeUndefined();
});
