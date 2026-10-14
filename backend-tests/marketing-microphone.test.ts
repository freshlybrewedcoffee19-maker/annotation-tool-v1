import {afterEach,expect,test,vi} from 'vitest';
import {MarketingMicrophone} from '../src/marketing/pcm';
afterEach(()=>vi.unstubAllGlobals());

test('audio is activated during the mic click before permission resolves, and cancellation releases it',async()=>{
 const resume=vi.fn(async()=>{}),close=vi.fn(async()=>{});
 vi.stubGlobal('AudioContext',class {resume=resume;close=close;});
 let rejectPermission!:(reason:Error)=>void;
 vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:()=>new Promise((_resolve,reject)=>{rejectPermission=reject;})}});
 const opening=MarketingMicrophone.open(()=>{});
 expect(resume).toHaveBeenCalledOnce();
 rejectPermission(new DOMException('Denied','NotAllowedError'));
 await expect(opening).rejects.toThrow('Denied');expect(close).toHaveBeenCalledOnce();
});
