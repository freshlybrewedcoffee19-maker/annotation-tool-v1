import {afterEach,expect,test,vi} from 'vitest';
import {MarketingSpeechSession,watchVoiceVisibility,type Recognition} from '../src/marketing/voice-session';
import {FeedbackCommands,playMarkedVideo} from '../src/marketing/voice-commands';

class Speech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 start=vi.fn();abort=vi.fn();
}
function setup(){const instances:Speech[]=[],states:string[]=[],errors:string[]=[],results=vi.fn(),boundaries=vi.fn();const session=new MarketingSpeechSession(()=>{const instance=new Speech();instances.push(instance);return instance;},{state:value=>states.push(value),error:value=>errors.push(value),result:results,boundary:boundaries,speechStart:()=>{},speechEnd:()=>{}});session.start();return {session,instances,states,errors,results,boundaries};}
afterEach(()=>vi.useRealTimers());

test('a natural session end resumes from an unfinished exact start before resetting results',()=>{
 vi.useFakeTimers();const recognizer=new Speech(),start=vi.fn();
 const commands=new FeedbackCommands({start,stop:()=>{},feedback:()=>{}});commands.phase='feedback';
 const session=new MarketingSpeechSession(()=>recognizer,{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:()=>commands.result(0,'Start',false,{videoTime:3,audioFrame:80})});
 session.start();recognizer.onstart?.();recognizer.onresult?.({});expect(start).not.toHaveBeenCalled();
 recognizer.onend?.();expect(start).toHaveBeenCalledExactlyOnceWith({videoTime:3,audioFrame:80});session.stop();
});

test('a network interruption does not turn an unfinished feedback phrase into a command',()=>{
 vi.useFakeTimers();const recognizer=new Speech(),start=vi.fn();
 const commands=new FeedbackCommands({start,stop:()=>{},feedback:()=>{}});commands.phase='feedback';
 const session=new MarketingSpeechSession(()=>recognizer,{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:()=>commands.result(0,'Start',false,{videoTime:3,audioFrame:80})});
 session.start();recognizer.onstart?.();recognizer.onresult?.({});recognizer.onerror?.({error:'network'});recognizer.onend?.();
 expect(start).not.toHaveBeenCalled();session.stop();
});

test('speech ending before the final transcript does not mistake feedback for a start command',()=>{
 vi.useFakeTimers();const recognizer=new Speech(),start=vi.fn(),feedback=vi.fn();
 const commands=new FeedbackCommands({start,stop:()=>{},feedback});commands.phase='feedback';
 const session=new MarketingSpeechSession(()=>recognizer,{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:event=>commands.result(0,event.text,event.final,{videoTime:3,audioFrame:80})});
 session.start();recognizer.onstart?.();recognizer.onresult?.({text:'Start',final:false});
 recognizer.onspeechend?.();expect(start).not.toHaveBeenCalled();
 recognizer.onresult?.({text:'Start with the logo instead.',final:true});recognizer.onend?.();
 expect(start).not.toHaveBeenCalled();expect(feedback).toHaveBeenCalledExactlyOnceWith('Start with the logo instead.');session.stop();
});

test('listening starts only after the browser confirms recognition; denial stops retries',()=>{
 vi.useFakeTimers();const {instances,states,errors}=setup();expect(states.at(-1)).toBe('connecting');
 instances[0].onstart?.();expect(states.at(-1)).toBe('listening');
 instances[0].onerror?.({error:'not-allowed'});instances[0].onend?.();vi.advanceTimersByTime(30000);
 expect(states.at(-1)).toBe('error');expect(instances).toHaveLength(1);expect(errors[0]).toMatch(/permission/i);
});

test('idle recognition reconnects and stale recognizers cannot issue commands',()=>{
 vi.useFakeTimers();const {session,instances,states,results,boundaries}=setup();instances[0].onstart?.();const staleResult=instances[0].onresult;
 instances[0].onend?.();expect(states.at(-1)).toBe('reconnecting');expect(boundaries).toHaveBeenCalledExactlyOnceWith(true);vi.advanceTimersByTime(300);
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

test('a browser cancellation stops listening without reclaiming the microphone',()=>{
 vi.useFakeTimers();const {instances,states,errors,boundaries}=setup();instances[0].onstart?.();
 const lateEnd=instances[0].onend;
 instances[0].onerror?.({error:'aborted'});lateEnd?.();vi.advanceTimersByTime(60000);
 expect(instances).toHaveLength(1);expect(states.at(-1)).toBe('error');
 expect(errors).toEqual(['Voice listening was interrupted. Turn the mic on again when you are ready. Your feedback is kept.']);
 expect(boundaries).toHaveBeenCalledExactlyOnceWith(false);
});

test('voice visibility watcher stops only for a hidden document and removes its listener on cleanup',()=>{
 const target=Object.assign(new EventTarget(),{visibilityState:'visible' as DocumentVisibilityState}),hidden=vi.fn();
 const cleanup=watchVoiceVisibility(hidden,target);
 target.dispatchEvent(new Event('visibilitychange'));expect(hidden).not.toHaveBeenCalled();
 target.visibilityState='hidden';target.dispatchEvent(new Event('visibilitychange'));expect(hidden).toHaveBeenCalledOnce();
 target.visibilityState='visible';target.dispatchEvent(new Event('visibilitychange'));expect(hidden).toHaveBeenCalledOnce();
 cleanup();target.visibilityState='hidden';target.dispatchEvent(new Event('visibilitychange'));expect(hidden).toHaveBeenCalledOnce();
});

test('starting a clip resumes playback and returns a useful error if the browser blocks it',async()=>{
 const player={currentTime:4,play:vi.fn(async()=>{})};await playMarkedVideo(player,1.5);expect(player.currentTime).toBe(1.5);expect(player.play).toHaveBeenCalledOnce();
 player.play.mockRejectedValueOnce(new DOMException('Blocked','NotAllowedError'));
 await expect(playMarkedVideo(player,2)).rejects.toThrow(/Play button/);
});
