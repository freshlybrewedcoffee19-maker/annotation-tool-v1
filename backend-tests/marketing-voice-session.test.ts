import {afterEach,expect,test,vi} from 'vitest';
import {MarketingSpeechSession,watchVoiceVisibility,type Recognition} from '../src/marketing/voice-session';
import {FeedbackCommands,playMarkedVideo} from '../src/marketing/voice-commands';

class Speech implements Recognition {
 continuous=false;interimResults=false;lang='';
 onstart:Recognition['onstart']=null;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onspeechstart:Recognition['onspeechstart']=null;onspeechend:Recognition['onspeechend']=null;
 start=vi.fn();abort=vi.fn();
}
function setup(options:{pauseTolerant?:boolean}={}){const instances:Speech[]=[],states:string[]=[],errors:string[]=[],results=vi.fn(),boundaries=vi.fn();const session=new MarketingSpeechSession(()=>{const instance=new Speech();instances.push(instance);return instance;},{state:value=>states.push(value),error:value=>errors.push(value),result:results,boundary:boundaries,speechStart:()=>{},speechEnd:()=>{}},options);session.start();return {session,instances,states,errors,results,boundaries};}
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

test('quiet listening stays connected without a result timeout',()=>{
 vi.useFakeTimers();const {session,instances,states,errors}=setup();instances[0].onstart?.();
 vi.advanceTimersByTime(120000);
 expect(instances).toHaveLength(1);expect(states.at(-1)).toBe('listening');expect(errors).toEqual([]);
 session.stop();
});

test('captured voice without results restarts at most twice before reporting the stalled speech service',()=>{
 vi.useFakeTimers();const {session,instances,states,errors,boundaries}=setup();
 for(let index=0;index<3;index++){
  instances[index].onstart?.();session.noteAudioActivity();
  for(let second=0;second<8;second++){vi.advanceTimersByTime(1000);session.noteAudioActivity();}
  if(index<2){expect(states.at(-1)).toBe('reconnecting');vi.advanceTimersByTime(250);}
 }
 expect(instances).toHaveLength(3);expect(states.at(-1)).toBe('error');expect(errors).toHaveLength(1);
 expect(errors[0]).toMatch(/heard audio.*no words/i);expect(errors[0]).toMatch(/Safari.*iPhone.*Chrome.*Android/);
 expect(boundaries.mock.calls.every(([complete])=>complete===false)).toBe(true);
 vi.advanceTimersByTime(120000);expect(instances).toHaveLength(3);
});

test('speech-start detection also watches for results and a result cancels the watchdog',()=>{
 vi.useFakeTimers();const {session,instances,states,results}=setup();instances[0].onstart?.();
 instances[0].onspeechstart?.();vi.advanceTimersByTime(8000);expect(states.at(-1)).toBe('reconnecting');
 vi.advanceTimersByTime(250);instances[1].onstart?.();instances[1].onspeechstart?.();
 vi.advanceTimersByTime(7000);instances[1].onresult?.({resultIndex:0,results:[]});
 vi.advanceTimersByTime(120000);expect(instances).toHaveLength(2);expect(results).toHaveBeenCalledOnce();
 expect(states.at(-1)).toBe('listening');session.stop();
});

test('retired speech callbacks and capture activity after stop cannot start another watchdog',()=>{
 vi.useFakeTimers();const {session,instances,states,results}=setup();instances[0].onstart?.();
 const staleSpeech=instances[0].onspeechstart,staleResult=instances[0].onresult;
 session.noteAudioActivity();vi.advanceTimersByTime(8000);vi.advanceTimersByTime(250);instances[1].onstart?.();
 staleSpeech?.();staleResult?.({});vi.advanceTimersByTime(120000);
 expect(instances).toHaveLength(2);expect(results).not.toHaveBeenCalled();expect(states.at(-1)).toBe('listening');
 session.noteAudioActivity();session.stop();session.noteAudioActivity();instances[1].onspeechstart?.();
 vi.advanceTimersByTime(120000);expect(instances).toHaveLength(2);expect(states.at(-1)).toBe('off');
});

test('continuous recognition defaults on and can be disabled for each mobile session',()=>{
 vi.useFakeTimers();const desktop=setup();expect(desktop.instances[0].continuous).toBe(true);desktop.session.stop();
 const instances:Speech[]=[],session=new MarketingSpeechSession(()=>{const value=new Speech();instances.push(value);return value;},{state:()=>{},error:()=>{},result:()=>{},boundary:()=>{},speechStart:()=>{},speechEnd:()=>{}},{continuous:false});
 session.start();expect(instances[0].continuous).toBe(false);instances[0].onstart?.();instances[0].onend?.();
 vi.advanceTimersByTime(250);expect(instances[1].continuous).toBe(false);session.stop();
});

test('playback refresh is debounced, does not restart a stopped session, and clears pending activity timers',()=>{
 vi.useFakeTimers();const {session,instances,boundaries}=setup();instances[0].onstart?.();session.noteAudioActivity();
 session.refreshAfterPlayback();vi.advanceTimersByTime(200);session.refreshAfterPlayback();
 vi.advanceTimersByTime(299);expect(instances).toHaveLength(1);
 vi.advanceTimersByTime(1);expect(instances).toHaveLength(2);expect(instances[0].abort).toHaveBeenCalledOnce();
 expect(boundaries).toHaveBeenCalledExactlyOnceWith(false);instances[1].onstart?.();
 vi.advanceTimersByTime(10000);expect(instances).toHaveLength(2);
 session.refreshAfterPlayback();session.stop();session.refreshAfterPlayback();vi.advanceTimersByTime(10000);
 expect(instances).toHaveLength(2);
});

test('playback refresh waits for a connected recognizer and cannot finish a partial feedback command',()=>{
 vi.useFakeTimers();const start=vi.fn(),commands=new FeedbackCommands({start,stop:()=>{},feedback:()=>{}}),instances:Speech[]=[];
 commands.phase='feedback';
 const session=new MarketingSpeechSession(()=>{const value=new Speech();instances.push(value);return value;},{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:()=>commands.result(0,'Start',false,{videoTime:3,audioFrame:80})});
 session.start();session.refreshAfterPlayback();vi.advanceTimersByTime(300);expect(instances).toHaveLength(1);
 instances[0].onstart?.();instances[0].onresult?.({});session.refreshAfterPlayback();
 vi.advanceTimersByTime(300);expect(instances).toHaveLength(2);expect(start).not.toHaveBeenCalled();expect(commands.phase).toBe('feedback');session.stop();
});

test('fresh partial speech after stop cancels the playback restart and preserves the joined feedback',()=>{
 vi.useFakeTimers();const instances:Speech[]=[],feedback=vi.fn();
 const commands=new FeedbackCommands({start:()=>{},stop:()=>session.refreshAfterPlayback(),feedback});commands.phase='marking';
 const session=new MarketingSpeechSession(()=>{const value=new Speech();instances.push(value);return value;},{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:event=>commands.result(0,event.text,event.final,{videoTime:2,audioFrame:20})});
 session.start();instances[0].onstart?.();instances[0].onresult?.({text:'Stop',final:false});
 vi.advanceTimersByTime(200);instances[0].onresult?.({text:'Stop, make the logo',final:false});
 vi.advanceTimersByTime(600);expect(instances).toHaveLength(1);expect(feedback).not.toHaveBeenCalled();
 instances[0].onresult?.({text:'Stop, make the logo bigger.',final:true});
 expect(feedback).toHaveBeenCalledExactlyOnceWith('make the logo bigger.');session.stop();
});

test('new speech after a playback change defers recovery until the result watchdog expires',()=>{
 vi.useFakeTimers();const {session,instances,states}=setup();instances[0].onstart?.();session.refreshAfterPlayback();
 vi.advanceTimersByTime(200);instances[0].onspeechstart?.();
 vi.advanceTimersByTime(300);expect(instances).toHaveLength(1);expect(states.at(-1)).toBe('listening');
 vi.advanceTimersByTime(7700);expect(states.at(-1)).toBe('reconnecting');
 vi.advanceTimersByTime(250);expect(instances).toHaveLength(2);session.stop();
});

test('an active interim stop keeps a slow joined feedback utterance alive past the playback delay',()=>{
 vi.useFakeTimers();const instances:Speech[]=[],feedback=vi.fn();
 const commands=new FeedbackCommands({start:()=>{},stop:()=>session.refreshAfterPlayback(),feedback});commands.phase='marking';
 const session=new MarketingSpeechSession(()=>{const value=new Speech();instances.push(value);return value;},{state:()=>{},error:()=>{},speechStart:()=>{},speechEnd:()=>{},boundary:complete=>{if(complete)commands.endUtterance();commands.resetResults();},result:event=>commands.result(0,event.results[0][0].transcript,event.results[0].isFinal,{videoTime:2,audioFrame:20})});
 session.start();instances[0].onstart?.();
 instances[0].onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:'Stop'}}]});
 vi.advanceTimersByTime(1500);expect(instances).toHaveLength(1);expect(instances[0].abort).not.toHaveBeenCalled();
 instances[0].onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'Stop, make the logo bigger.'}}]});
 expect(feedback).toHaveBeenCalledExactlyOnceWith('make the logo bigger.');
 vi.advanceTimersByTime(10000);expect(instances).toHaveLength(1);session.stop();
});

test('an interim transcript with no further progress recovers even after native speech has ended',()=>{
 vi.useFakeTimers();const {session,instances,states,boundaries}=setup();instances[0].onstart?.();
 instances[0].onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:'Make the'}}]});
 instances[0].onspeechend?.();session.refreshAfterPlayback();
 vi.advanceTimersByTime(7999);expect(instances).toHaveLength(1);expect(states.at(-1)).toBe('listening');
 vi.advanceTimersByTime(1);expect(states.at(-1)).toBe('reconnecting');expect(boundaries).toHaveBeenCalledExactlyOnceWith(false);
 vi.advanceTimersByTime(250);expect(instances).toHaveLength(2);session.stop();
});

test('native speech in progress prevents playback refresh before its first partial result',()=>{
 vi.useFakeTimers();const {session,instances,states}=setup();instances[0].onstart?.();instances[0].onspeechstart?.();
 session.refreshAfterPlayback();vi.advanceTimersByTime(300);expect(instances).toHaveLength(1);
 vi.advanceTimersByTime(7700);expect(states.at(-1)).toBe('reconnecting');session.stop();
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

test('Android slow speech gets thirty seconds for words instead of an eight-second forced restart',()=>{
 vi.useFakeTimers();const {session,instances,states}=setup({pauseTolerant:true});instances[0].onstart?.();instances[0].onspeechstart?.();
 vi.advanceTimersByTime(29999);expect(instances).toHaveLength(1);expect(instances[0].abort).not.toHaveBeenCalled();expect(states.at(-1)).toBe('listening');
 vi.advanceTimersByTime(1);expect(states.at(-1)).toBe('reconnecting');vi.advanceTimersByTime(250);expect(instances).toHaveLength(2);session.stop();
});

test.each([false,true])('Android thinking pauses cancel the speech watchdog even with unfinished filler (interim=%s)',hasInterim=>{
 vi.useFakeTimers();const {session,instances,states}=setup({pauseTolerant:true});instances[0].onstart?.();instances[0].onspeechstart?.();
 if(hasInterim)instances[0].onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:'umm'}}]});
 vi.advanceTimersByTime(1000);instances[0].onspeechend?.();vi.advanceTimersByTime(60000);
 expect(instances).toHaveLength(1);expect(instances[0].abort).not.toHaveBeenCalled();expect(states.at(-1)).toBe('listening');
 instances[0].onspeechstart?.();vi.advanceTimersByTime(20000);
 instances[0].onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'Make the logo bigger.'}}]});
 vi.advanceTimersByTime(60000);expect(instances).toHaveLength(1);session.stop();
});

test.each(['end','no-speech'])('Android rapid empty %s cycles back off, then stop with the draft-preservation notice',reason=>{
 vi.useFakeTimers();const {session,instances,states,errors,boundaries}=setup({pauseTolerant:true});
 for(const [index,delay] of [250,1000,2000].entries()){
  const current=instances[index];current.onstart?.();vi.advanceTimersByTime(100);
  const staleEnd=current.onend;
  if(reason==='end')current.onend?.();else current.onerror?.({error:'no-speech'});
  staleEnd?.();expect(boundaries).toHaveBeenCalledTimes(index+1);
  vi.advanceTimersByTime(delay-1);expect(instances).toHaveLength(index+1);
  vi.advanceTimersByTime(1);expect(instances).toHaveLength(index+2);
 }
 instances[3].onstart?.();vi.advanceTimersByTime(100);instances[3].onend?.();
 expect(states.at(-1)).toBe('error');expect(errors).toHaveLength(1);expect(errors[0]).toMatch(/keeps stopping.*feedback is kept.*mic.*retry/i);
 vi.advanceTimersByTime(120000);expect(instances).toHaveLength(4);session.stop();
});

test('Android connected and empty callbacks do not reset rapid-loop protection, but words do',()=>{
 vi.useFakeTimers();const {session,instances}=setup({pauseTolerant:true});
 instances[0].onstart?.();instances[0].onend?.();vi.advanceTimersByTime(250);
 instances[1].onstart?.();instances[1].onresult?.({resultIndex:0,results:[]});instances[1].onend?.();
 vi.advanceTimersByTime(999);expect(instances).toHaveLength(2);vi.advanceTimersByTime(1);expect(instances).toHaveLength(3);
 instances[2].onstart?.();instances[2].onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'Make the logo bigger.'}}]});instances[2].onend?.();
 vi.advanceTimersByTime(250);expect(instances).toHaveLength(4);
 instances[3].onstart?.();instances[3].onend?.();vi.advanceTimersByTime(250);expect(instances).toHaveLength(5);session.stop();
});

test('Android normal-length empty sessions reset rapid-loop protection and keep hands-free listening',()=>{
 vi.useFakeTimers();const {session,instances,errors}=setup({pauseTolerant:true});
 instances[0].onstart?.();instances[0].onend?.();vi.advanceTimersByTime(250);
 instances[1].onstart?.();instances[1].onend?.();vi.advanceTimersByTime(1000);
 for(let index=2;index<7;index++){
  instances[index].onstart?.();vi.advanceTimersByTime(2000);instances[index].onend?.();vi.advanceTimersByTime(250);expect(instances).toHaveLength(index+2);
 }
 instances[7].onstart?.();instances[7].onend?.();vi.advanceTimersByTime(250);expect(instances).toHaveLength(9);expect(errors).toEqual([]);session.stop();
});

test('Android explicit stop cancels backed-off retries and ignores every retired callback',()=>{
 vi.useFakeTimers();const {session,instances,states,results}=setup({pauseTolerant:true});
 instances[0].onstart?.();instances[0].onend?.();vi.advanceTimersByTime(250);
 const stale=instances[1],onstart=stale.onstart,onend=stale.onend,onresult=stale.onresult,onerror=stale.onerror,onspeechstart=stale.onspeechstart;
 stale.onstart?.();stale.onerror?.({error:'no-speech'});session.stop();
 onstart?.();onend?.();onerror?.({error:'no-speech'});onspeechstart?.();onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'start'}}]});
 vi.advanceTimersByTime(120000);expect(instances).toHaveLength(2);expect(states.at(-1)).toBe('off');expect(results).not.toHaveBeenCalled();
});
