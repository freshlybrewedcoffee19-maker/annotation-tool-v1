import {afterEach,expect,test,vi} from 'vitest';
import {FeedbackAutosave} from '../src/marketing/feedback-autosave';

afterEach(()=>vi.useRealTimers());

test('completed feedback saves once after a quiet period, extending the wait for another sentence',()=>{
 vi.useFakeTimers();
 const save=vi.fn(),autosave=new FeedbackAutosave(save);
 autosave.finalized();
 vi.advanceTimersByTime(1000);
 expect(save).not.toHaveBeenCalled();
 autosave.finalized();
 vi.advanceTimersByTime(1499);
 expect(save).not.toHaveBeenCalled();
 vi.advanceTimersByTime(1);
 expect(save).toHaveBeenCalledTimes(1);
 vi.advanceTimersByTime(5000);
 expect(save).toHaveBeenCalledTimes(1);
});

test('speech activity keeps unfinished words out of automatic saving until another final result',()=>{
 vi.useFakeTimers();
 const save=vi.fn(),autosave=new FeedbackAutosave(save,1000);
 autosave.finalized();
 vi.advanceTimersByTime(500);
 autosave.activity();
 vi.advanceTimersByTime(2000);
 expect(save).not.toHaveBeenCalled();
 autosave.finalized();
 vi.advanceTimersByTime(1000);
 expect(save).toHaveBeenCalledTimes(1);
});

test('a cancelled draft cannot save later, and the next completed comment can still save',()=>{
 vi.useFakeTimers();
 const save=vi.fn(),autosave=new FeedbackAutosave(save);
 autosave.finalized();
 vi.advanceTimersByTime(1200);
 autosave.cancel();
 autosave.cancel();
 vi.advanceTimersByTime(5000);
 expect(save).not.toHaveBeenCalled();
 autosave.finalized();
 vi.advanceTimersByTime(1500);
 expect(save).toHaveBeenCalledTimes(1);
});
