import {expect,test,vi} from 'vitest';
import {prepareVoicePlayback} from '../src/marketing/voice-commands';

test('the mic tap authorizes this video synchronously without changing its paused position',async()=>{
 const order:string[]=[];
 const video={playsInline:false,paused:true,currentTime:2.75,play:vi.fn(()=>{order.push('play');return Promise.reject(new DOMException('Paused during preparation','AbortError'));}),pause:vi.fn(()=>order.push('pause'))};
 prepareVoicePlayback(video);
 expect(order).toEqual(['play','pause']);
 expect(video.playsInline).toBe(true);
 expect(video.currentTime).toBe(2.75);
 await Promise.resolve();
});

test('enabling voice while a video is playing does not interrupt playback',()=>{
 const video={playsInline:false,paused:false,currentTime:4,play:vi.fn(),pause:vi.fn()};
 prepareVoicePlayback(video);
 expect(video.playsInline).toBe(true);
 expect(video.play).not.toHaveBeenCalled();
 expect(video.pause).not.toHaveBeenCalled();
 expect(video.currentTime).toBe(4);
});

test('a preparation failure does not prevent microphone startup',()=>{
 const video={playsInline:false,paused:true,currentTime:0,play:vi.fn(()=>{throw new DOMException('Not ready','NotSupportedError');}),pause:vi.fn()};
 expect(()=>prepareVoicePlayback(video)).not.toThrow();
});
