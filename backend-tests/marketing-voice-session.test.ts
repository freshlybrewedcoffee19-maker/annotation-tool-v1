import {afterEach,expect,test,vi} from 'vitest';
import {MarketingSpeechSession,type Recognition} from '../src/marketing/voice-session';
import {playMarkedVideo} from '../src/marketing/voice-commands';

class Speech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 start=vi.fn();abort=vi.fn();
}
function setup(){const instances:Speech[]=[],states:string[]=[],errors:string[]=[],results=vi.fn(),boundaries=vi.fn();const session=new MarketingSpeechSession(()=>{const instance=new Speech();instances.push(instance);return instance;},{state:value=>states.push(value),error:value=>errors.push(value),result:results,boundary:boundaries,speechStart:()=>{},speechEnd:()=>{}});session.start();return {session,instances,states,errors,results,boundaries};}
afterEach(()=>vi.useRealTimers());

test('listening starts only after the browser confirms recognition; denial stops retries',()=>{
 vi.useFakeTimers();const {instances,states,errors}=setup();expect(states.at(-1)).toBe('connecting');
 instances[0].onstart?.();expect(states.at(-1)).toBe('listening');
 instances[0].onerror?.({error:'not-allowed'});instances[0].onend?.();vi.advanceTimersByTime(30000);
 expect(states.at(-1)).toBe('error');expect(instances).toHaveLength(1);expect(errors[0]).toMatch(/permission/i);
});

test('idle recognition reconnects and stale recognizers cannot issue commands',()=>{
 vi.useFakeTimers();const {session,instances,states,results,boundaries}=setup();instances[0].onstart?.();const staleResult=instances[0].onresult;
 instances[0].onend?.();expect(states.at(-1)).toBe('reconnecting');expect(boundaries).toHaveBeenCalledOnce();vi.advanceTimersByTime(300);
 instances[1].onstart?.();staleResult?.({resultIndex:0,results:[]});expect(results).not.toHaveBeenCalled();
 instances[1].onresult?.({resultIndex:0,results:[]});expect(results).toHaveBeenCalledOnce();
 session.stop();vi.advanceTimersByTime(30000);expect(instances).toHaveLength(2);expect(states.at(-1)).toBe('off');
});

test('network failures have bounded retries and a stalled connection is reported',()=>{
 vi.useFakeTimers();const {instances,states,errors}=setup();
 for(let index=0;index<3;index++){instances[index].onerror?.({error:'network'});instances[index].onend?.();vi.advanceTimersByTime(2000);}
 expect(instances).toHaveLength(3);expect(states.at(-1)).toBe('error');expect(errors[0]).toMatch(/connect|network/i);
 const stalled=setup();vi.advanceTimersByTime(10000);expect(stalled.states.at(-1)).toBe('error');expect(stalled.errors[0]).toMatch(/connect/i);
});

test('starting a clip resumes playback and returns a useful error if the browser blocks it',async()=>{
 const player={currentTime:4,play:vi.fn(async()=>{})};await playMarkedVideo(player,1.5);expect(player.currentTime).toBe(1.5);expect(player.play).toHaveBeenCalledOnce();
 player.play.mockRejectedValueOnce(new DOMException('Blocked','NotAllowedError'));
 await expect(playMarkedVideo(player,2)).rejects.toThrow(/Play button/);
});
