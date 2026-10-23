import {useEffect,useState,type RefObject} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {useWorkspace} from './workspace';
import {adjacentFrame,frameTimecode,parseFrameTimecode} from './player-time';

export type DraftHistory={active:boolean;canUndo:boolean;canRedo:boolean;undo:()=>void;redo:()=>void};
export function TrialPlayer({video,frameRate,episodeId,active,draft,locked=false,onBusyChange,videoOnly=false}:{video:RefObject<HTMLVideoElement|null>;frameRate?:number|null;episodeId:Id<'episodes'>;active:boolean;draft?:DraftHistory;locked?:boolean;onBusyChange?:(busy:boolean)=>void;videoOnly?:boolean}){
 const {workspaceToken}=useWorkspace();
 const savedHistory=useQuery(api.trialHistory.status,{workspaceToken,episodeId}),apply=useMutation(api.trialHistory.apply);
 // The existing status API exposes a description, not an edit kind. Only allow
 // the four descriptions produced by video segment saves; never skip a drawing
 // entry or rewrite history to reach an older video edit.
 const videoEdit=(item:NonNullable<typeof savedHistory>['undo'])=>item&&['Add voice tag','Add segment','Edit segment','Delete segment'].includes(item.description)?item:null;
 const history=videoOnly&&savedHistory?{undo:videoEdit(savedHistory.undo),redo:videoEdit(savedHistory.redo)}:savedHistory;
 const [position,setPosition]=useState(0),[duration,setDuration]=useState(0),[paused,setPaused]=useState(true),[typed,setTyped]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const fps=frameRate&&Number.isInteger(frameRate)&&frameRate>0?frameRate:null;
 useEffect(()=>{const player=video.current;if(!player)return;const update=()=>{setPosition(player.currentTime);setDuration(Number.isFinite(player.duration)?player.duration:0);setPaused(player.paused);};const events=['timeupdate','loadedmetadata','durationchange','play','pause','seeked'];events.forEach(e=>player.addEventListener(e,update));update();return()=>events.forEach(e=>player.removeEventListener(e,update));},[video]);
 useEffect(()=>{onBusyChange?.(pending);return()=>onBusyChange?.(false);},[pending,onBusyChange]);
 function seek(time:number){const player=video.current;if(!player||!duration)return;player.pause();const target=Math.max(0,Math.min(duration,time));player.currentTime=target;setPosition(target);setError('');}
 function step(direction:-1|1){if(fps&&video.current)seek(adjacentFrame(video.current.currentTime,direction,fps,duration));}
 const canUndo=!pending&&!locked&&(draft?.active?draft.canUndo:!!history?.undo),canRedo=!pending&&!locked&&(draft?.active?draft.canRedo:!!history?.redo);
 async function change(direction:'undo'|'redo'){
  if(direction==='undo'?!canUndo:!canRedo)return;
  if(draft?.active){draft[direction]();return;}
  const item=history?.[direction];if(!item)return;setPending(true);setError('');
  try{await apply({workspaceToken,episodeId,entryId:item.id,direction});}catch(e){setError(e instanceof Error?e.message:'The edit could not be restored. Try again.');}finally{setPending(false);}
 }
 useEffect(()=>{
  const keys=(e:KeyboardEvent)=>{
   if(!active||e.repeat||e.defaultPrevented)return;
   if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
   const key=e.key.toLowerCase();
   if((e.ctrlKey||e.metaKey)&&!e.altKey&&(key==='z'||key==='y')){e.preventDefault();e.stopPropagation();void change(key==='y'||e.shiftKey?'redo':'undo');return;}
   if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){if(!fps||!duration)return;e.preventDefault();e.stopPropagation();step(e.key==='ArrowLeft'?-1:1);}
  };
  window.addEventListener('keydown',keys,true);return()=>window.removeEventListener('keydown',keys,true);
 },[active,fps,duration,canUndo,canRedo,history,draft,position]);
 return <div className="trial-player" aria-label="Trial player controls">
  <div className="editor-playback" role="group" aria-label="Video playback">{[-10,-5].map(delta=><button className="main-skip" type="button" key={delta} aria-label={`Jump back ${-delta} seconds`} disabled={!duration} onClick={()=>seek((video.current?.currentTime??0)+delta)}>{delta}s</button>)}
   <button type="button" aria-label="Previous frame" title="Previous frame (Left arrow)" disabled={!fps||!duration||position<=0} onClick={()=>step(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 5l-9 7 9 7Z"/></svg></button>
   <button type="button" className="playback-toggle" aria-label={paused?'Play video':'Pause video'} disabled={!duration} onClick={()=>{const player=video.current;if(player){if(player.paused)void player.play().catch(()=>setError('The video could not play. Try again.'));else player.pause();}}}><svg viewBox="0 0 24 24" aria-hidden="true">{paused?<path d="m8 5 11 7-11 7Z"/>:<path d="M8 5v14M16 5v14"/>}</svg></button>
   <button type="button" aria-label="Next frame" title="Next frame (Right arrow)" disabled={!fps||!duration||position>=(Math.ceil(duration*(fps??1))-1)/(fps??1)} onClick={()=>step(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 5l9 7-9 7Z"/></svg></button>
   {[5,10].map(delta=><button className="main-skip" type="button" key={delta} aria-label={`Jump forward ${delta} seconds`} disabled={!duration} onClick={()=>seek((video.current?.currentTime??0)+delta)}>+{delta}s</button>)}
   <input aria-label="Seek video" type="range" min="0" max={duration||1} step="0.001" value={Math.min(position,duration||1)} disabled={!duration} onInput={e=>seek(Number(e.currentTarget.value))}/>
   <span className="playback-time">{fps?frameTimecode(position,fps):position.toFixed(2)} / {fps?frameTimecode(duration,fps):duration.toFixed(2)}</span>
  </div>
  <div className="player-edit-controls">
   <div className="player-history" role="group" aria-label="Edit history"><button type="button" disabled={!canUndo} title={`Undo ${draft?.active?'polygon point':history?.undo?.description??'edit'} (Ctrl+Z / Cmd+Z)`} onClick={()=>void change('undo')}>Undo</button><button type="button" disabled={!canRedo} title={`Redo ${draft?.active?'polygon point':history?.redo?.description??'edit'} (Ctrl+Y / Cmd+Shift+Z)`} onClick={()=>void change('redo')}>Redo</button></div>
   <div className="player-jumps" role="group" aria-label="Jump seconds">{[-10,-5,5,10].map(delta=><button type="button" key={delta} aria-label={`Jump ${delta<0?'back':'forward'} ${Math.abs(delta)} seconds`} title={`Jump ${delta<0?'back':'forward'} ${Math.abs(delta)} seconds`} disabled={!duration} onClick={()=>seek((video.current?.currentTime??0)+delta)}>{delta>0?'+':''}{delta}s</button>)}</div>
   <form className="player-time-jump" onSubmit={e=>{e.preventDefault();try{seek(parseFrameTimecode(typed,fps??0,duration));}catch(e){setError(e instanceof Error?e.message:'Enter a valid time.');}}}><input aria-label="Exact time (MM:SS:FF)" placeholder="MM:SS:FF" maxLength={8} value={typed} onChange={e=>setTyped(e.target.value)} disabled={!duration||!fps}/><button type="submit" disabled={!duration||!fps}>Go</button></form>
   <span className="player-fps">{fps?`${fps} fps`:'Frame rate unavailable'}</span>
  </div>
  {error&&<p className="player-error" role="alert">{error}</p>}
 </div>;
}

