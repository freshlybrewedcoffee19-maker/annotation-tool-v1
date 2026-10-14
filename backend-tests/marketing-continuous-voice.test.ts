import {test,expect} from 'vitest';
import {FeedbackCommands} from '../src/marketing/voice-commands';
import {PcmTimeline} from '../src/marketing/pcm';

test('standalone start advances feedback while duplicate events and sentences containing start remain safe',()=>{
 const starts:any[]=[],stops:any[]=[],comments:string[]=[];
 const commands=new FeedbackCommands({start:t=>starts.push(t),stop:t=>stops.push(t),feedback:text=>comments.push(text)});
 commands.result(0,'start',false,{videoTime:1,audioFrame:10});
 commands.result(0,'start',true,{videoTime:1.3,audioFrame:15});
 commands.result(0,'start',true,{videoTime:2,audioFrame:20});
 commands.result(1,'stop',true,{videoTime:3,audioFrame:30});
 commands.result(2,'start',false,{videoTime:3,audioFrame:40});
 commands.result(2,'Start with the logo instead.',true,{videoTime:3,audioFrame:50});
 commands.result(3,'Use the start of the second shot.',true,{videoTime:3,audioFrame:60});
 commands.result(4,'Start.',false,{videoTime:4,audioFrame:70});
 commands.result(4,'Start.',true,{videoTime:4.5,audioFrame:80});
 commands.result(4,'Start.',true,{videoTime:5,audioFrame:90});
 commands.result(5,'stop',true,{videoTime:6,audioFrame:100});
 expect(starts).toEqual([{videoTime:1,audioFrame:10},{videoTime:4,audioFrame:70}]);
 expect(stops.map(t=>t.videoTime)).toEqual([3,6]);
 expect(comments).toEqual(['Start with the logo instead.','Use the start of the second shot.']);
});

test('PCM snapshots keep each comment separate and exclude the next start command at its onset',async()=>{
 const pcm=new PcmTimeline(1000);
 pcm.append(new Float32Array(200));
 const firstStart=pcm.frame;
 pcm.append(new Float32Array(400).fill(.2));
 pcm.append(new Float32Array(250));
 pcm.append(new Float32Array(200).fill(.8)); // spoken start command
 const commandStart=pcm.utteranceStart;
 const first=pcm.wav(firstStart,commandStart);
 const data=new DataView(await first.arrayBuffer());
 expect(data.getUint32(40,true)).toBe(650*2);
 const samples=new Int16Array(await first.arrayBuffer(),44);
 expect(Math.max(...samples)).toBeLessThan(10000); // command amplitude is absent
 const secondStart=pcm.frame;
 pcm.append(new Float32Array(300).fill(.4));
 const second=pcm.wav(secondStart,pcm.frame);
 expect(new DataView(await second.arrayBuffer()).getUint32(40,true)).toBe(600);
 expect(new DataView(await first.arrayBuffer()).getUint32(40,true)).toBe(1300);
});

test('common playback commands work and a stop joined to feedback keeps the comment',()=>{
 const starts:any[]=[],stops:any[]=[],comments:string[]=[];
 const commands=new FeedbackCommands({start:t=>starts.push(t),stop:t=>stops.push(t),feedback:text=>comments.push(text)});
 commands.result(0,'Start the video.',true,{videoTime:1,audioFrame:10});
 commands.result(1,'Stop. Make the logo bigger.',true,{videoTime:3,audioFrame:30});
 commands.result(2,'Start with the product shot.',true,{videoTime:3,audioFrame:40});
 commands.result(3,'Resume.',true,{videoTime:3,audioFrame:50});
 expect(starts.map(time=>time.videoTime)).toEqual([1,3]);expect(stops.map(time=>time.videoTime)).toEqual([3]);
 expect(comments).toEqual(['Make the logo bigger.','Start with the product shot.']);
});

test('stop the video and repeated stop are commands, never saved comments',()=>{
 const comments:string[]=[],stops:any[]=[];
 const commands=new FeedbackCommands({start:()=>{},stop:t=>stops.push(t),feedback:text=>comments.push(text)});
 commands.result(0,'Start',true,{videoTime:0,audioFrame:0});
 commands.result(1,'Stop the video',true,{videoTime:2,audioFrame:20});
 commands.result(2,'Stop',true,{videoTime:2,audioFrame:30});
 commands.result(3,'Make the logo bigger',true,{videoTime:2,audioFrame:40});
 expect(stops).toHaveLength(1);expect(comments).toEqual(['Make the logo bigger']);
});
