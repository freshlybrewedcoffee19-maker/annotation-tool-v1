import {afterEach,expect,test,vi} from 'vitest';
import {MarketingMicrophone} from '../src/marketing/pcm';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

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

function captureMocks(){
 const track={readyState:'live',muted:false,onended:null as null|(()=>void),onmute:null as null|(()=>void),onunmute:null as null|(()=>void),stop:vi.fn()};
 const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 const source={connect:vi.fn(),disconnect:vi.fn()};
 const node={connect:vi.fn(),disconnect:vi.fn(),port:{onmessage:null as null|((event:{data:Float32Array})=>void)}};
 const context={sampleRate:8000,state:'running',onstatechange:null as null|(()=>void),resume:vi.fn(async()=>{}),close:vi.fn(async()=>{}),audioWorklet:{addModule:vi.fn(async()=>{})},createMediaStreamSource:vi.fn(()=>source),destination:{}};
 const getUserMedia=vi.fn(async()=>stream);
 vi.stubGlobal('AudioContext',class{constructor(){return context;}});
 vi.stubGlobal('AudioWorkletNode',class{constructor(){return node;}});
 vi.stubGlobal('navigator',{mediaDevices:{getUserMedia}});
 return {track,stream,source,node,context,getUserMedia,frame:()=>node.port.onmessage?.({data:new Float32Array(128)})};
}

test('capture resumes again when permission or worklet setup suspends the audio context',async()=>{
 const {context,getUserMedia,stream}=captureMocks();
 context.resume.mockImplementation(async()=>{context.state='running';});
 getUserMedia.mockImplementation(async()=>{context.state='suspended';return stream;});
 context.audioWorklet.addModule.mockImplementation(async()=>{context.state='interrupted';});
 const capture=await MarketingMicrophone.open(()=>{});
 expect(context.resume).toHaveBeenCalledTimes(3);
 expect(context.state).toBe('running');capture.close();
});

test('a hung initial resume times out and releases an already granted microphone',async()=>{
 vi.useFakeTimers();const {context,track}=captureMocks();
 context.resume.mockImplementation(()=>new Promise(()=>{}));
 const opening=MarketingMicrophone.open(()=>{}),rejected=expect(opening).rejects.toThrow(/audio.*start|resume/i);
 await vi.advanceTimersByTimeAsync(10000);await rejected;
 expect(track.stop).toHaveBeenCalledOnce();expect(context.close).toHaveBeenCalledOnce();
});

test('permission granted after a resume timeout cannot leak a microphone track',async()=>{
 vi.useFakeTimers();const {context,track,stream,getUserMedia}=captureMocks();
 context.resume.mockImplementation(()=>new Promise(()=>{}));
 let grant!:(value:typeof stream)=>void;
 getUserMedia.mockImplementation(()=>new Promise(resolve=>{grant=resolve;}));
 const opening=MarketingMicrophone.open(()=>{}),rejected=expect(opening).rejects.toThrow(/audio.*start|resume/i);
 await vi.advanceTimersByTimeAsync(10000);await rejected;grant(stream);await Promise.resolve();
 expect(track.stop).toHaveBeenCalledOnce();expect(context.close).toHaveBeenCalledOnce();
});

test('a sustained muted live track reports the capture failure once and releases resources',async()=>{
 vi.useFakeTimers();const mocks=captureMocks(),capture=await MarketingMicrophone.open(()=>{}),interrupted=vi.fn();
 capture.onInterrupted(interrupted);mocks.frame();
 mocks.track.muted=true;mocks.track.onmute?.();
 await vi.advanceTimersByTimeAsync(1000);expect(interrupted).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(2000);
 expect(interrupted).toHaveBeenCalledOnce();expect(interrupted.mock.calls[0][0]).toMatch(/muted|recording/i);
 expect(mocks.track.stop).toHaveBeenCalledOnce();expect(mocks.node.port.onmessage).toBeNull();
 expect(mocks.context.onstatechange).toBeNull();expect(mocks.track.onmute).toBeNull();
 await vi.advanceTimersByTimeAsync(10000);expect(interrupted).toHaveBeenCalledOnce();
});

test('temporary mute recovers without treating silent PCM frames as failure',async()=>{
 vi.useFakeTimers();const mocks=captureMocks(),capture=await MarketingMicrophone.open(()=>{}),interrupted=vi.fn();
 capture.onInterrupted(interrupted);mocks.track.muted=true;mocks.track.onmute?.();
 await vi.advanceTimersByTimeAsync(500);mocks.track.muted=false;mocks.track.onunmute?.();
 for(let i=0;i<12;i++){mocks.frame();await vi.advanceTimersByTimeAsync(500);}
 expect(capture.pcm.frame).toBe(12*128);expect(interrupted).not.toHaveBeenCalled();capture.close();
});

test('a stopped audio context is reported even if the microphone track remains live',async()=>{
 vi.useFakeTimers();const mocks=captureMocks(),capture=await MarketingMicrophone.open(()=>{}),interrupted=vi.fn();
 capture.onInterrupted(interrupted);mocks.frame();mocks.context.state='interrupted';mocks.context.onstatechange?.();
 await vi.advanceTimersByTimeAsync(3000);
 expect(interrupted).toHaveBeenCalledOnce();expect(interrupted.mock.calls[0][0]).toMatch(/audio|recording/i);
 expect(mocks.track.stop).toHaveBeenCalledOnce();
});

test('missing PCM frames are reported and close removes all callbacks and timers',async()=>{
 vi.useFakeTimers();const mocks=captureMocks(),capture=await MarketingMicrophone.open(()=>{}),interrupted=vi.fn();
 capture.onInterrupted(interrupted);mocks.frame();
 const staleFrame=mocks.node.port.onmessage,staleEnded=mocks.track.onended;
 await vi.advanceTimersByTimeAsync(5000);
 expect(interrupted).toHaveBeenCalledOnce();expect(interrupted.mock.calls[0][0]).toMatch(/audio|recording/i);
 const before=capture.pcm.frame;staleFrame?.({data:new Float32Array(128)});staleEnded?.();capture.close();
 expect(capture.pcm.frame).toBe(before);expect(interrupted).toHaveBeenCalledOnce();
 expect(mocks.source.disconnect).toHaveBeenCalledOnce();expect(mocks.node.disconnect).toHaveBeenCalledOnce();
 expect(mocks.track.stop).toHaveBeenCalledOnce();expect(mocks.context.close).toHaveBeenCalledOnce();
 expect(vi.getTimerCount()).toBe(0);
});
