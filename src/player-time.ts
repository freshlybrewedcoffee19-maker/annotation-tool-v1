export function frameTimecode(seconds:number,fps:number){
 const frame=Math.max(0,Math.floor(seconds*fps+1e-3));
 const whole=Math.floor(frame/fps);
 return [Math.floor(whole/60),whole%60,frame%fps].map(n=>String(n).padStart(2,'0')).join(':');
}
export function parseFrameTimecode(text:string,fps:number,duration:number){
 const match=/^(\d{2}):(\d{2}):(\d{2})$/.exec(text.trim());
 if(!Number.isInteger(fps)||fps<=0)throw Error('A verified frame rate is needed to jump to a frame.');
 if(!match||Number(match[2])>59||Number(match[3])>=fps)throw Error(`Enter MM:SS:FF. Seconds are 00–59; frames are 00–${String(fps-1).padStart(2,'0')}.`);
 const time=Number(match[1])*60+Number(match[2])+Number(match[3])/fps;
 if(time>=duration)throw Error('Choose a time before the end of the video.');
 return time;
}
export function adjacentFrame(seconds:number,direction:-1|1,fps:number,duration:number){
 const last=Math.max(0,Math.ceil(duration*fps)-1);
 return Math.max(0,Math.min(last,Math.floor(seconds*fps+1e-3)+direction))/fps;
}
