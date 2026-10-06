import {useEffect,useState,type RefObject} from 'react';

export function EditorPlayback({video,frameRate}:{video:RefObject<HTMLVideoElement|null>;frameRate?:number|null}){
 const [position,setPosition]=useState(0),[duration,setDuration]=useState(0),[paused,setPaused]=useState(true);
 useEffect(()=>{
  const player=video.current;if(!player)return;
  const update=()=>{setPosition(player.currentTime);setDuration(Number.isFinite(player.duration)?player.duration:0);setPaused(player.paused);};
  const events=['timeupdate','loadedmetadata','durationchange','play','pause','seeked'];events.forEach(event=>player.addEventListener(event,update));update();
  return()=>events.forEach(event=>player.removeEventListener(event,update));
 },[video]);
 function seek(value:number){const player=video.current;if(player){player.pause();const target=Math.max(0,Math.min(duration,value));setPosition(target);player.currentTime=target;}}
 return <div className="editor-playback" role="group" aria-label="Video playback">
  <button type="button" aria-label={frameRate?'Previous estimated frame':'Back 0.1 seconds'} title={frameRate?'Previous estimated frame':'Back 0.1 seconds'} disabled={!duration} onClick={()=>seek(position-(frameRate?1/frameRate:.1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 5l-9 7 9 7Z"/></svg></button>
  <button type="button" className="playback-toggle" aria-label={paused?'Play video':'Pause video'} disabled={!duration} onClick={()=>{const player=video.current;if(player){if(player.paused)void player.play().catch(()=>{});else player.pause();}}}><svg viewBox="0 0 24 24" aria-hidden="true">{paused?<path d="m8 5 11 7-11 7Z"/>:<path d="M8 5v14M16 5v14"/>}</svg></button>
  <button type="button" aria-label={frameRate?'Next estimated frame':'Forward 0.1 seconds'} title={frameRate?'Next estimated frame':'Forward 0.1 seconds'} disabled={!duration} onClick={()=>seek(position+(frameRate?1/frameRate:.1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 5l9 7-9 7Z"/></svg></button>
  <input aria-label="Seek video" type="range" min="0" max={duration||1} step="0.001" value={Math.min(position,duration||1)} disabled={!duration} onInput={event=>seek(Number(event.currentTarget.value))}/>
  <span className="playback-time">{position.toFixed(2)} / {duration.toFixed(2)} sec</span>
 </div>;
}
