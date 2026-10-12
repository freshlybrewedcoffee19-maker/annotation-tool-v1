import {useEffect,useRef,useState,type RefObject} from 'react';
import type {Doc} from '../convex/_generated/dataModel';
import type {Activity} from './ActivityNavigation';
import {WorkspaceLayout} from './WorkspaceLayout';
import {ReviewDeck} from './ReviewDeck';
import {ExportReview} from './ExportReview';
import {TrackReview} from './TrackReview';
import {VoiceLabels} from './VoiceLabels';

export function ReviewWorkspace({episode,segments,activity,choose,labels,video,edit,next}:{episode:Doc<'episodes'>&{url:string|null};segments:Doc<'segments'>[];activity:Activity;choose:(activity:Activity)=>void;labels:string[];video:RefObject<HTMLVideoElement|null>;edit:(row:Doc<'segments'>)=>void;next:()=>void}){
 const [collapsed,setCollapsed]=useState(false),[controls,setControls]=useState<HTMLDivElement|null>(null);
 const panel=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(panel.current)panel.current.scrollTop=0;},[activity]);
 return <WorkspaceLayout activity={activity} choose={next=>{setCollapsed(false);choose(next);}} collapsed={collapsed} toggle={()=>setCollapsed(v=>!v)} title="Review & export">
  <section ref={panel} className="editor-toolrail workflow-controls" aria-label="Review and export controls">
   <div ref={setControls}/>
   <details><summary>Review by voice</summary><VoiceLabels episodeId={episode._id} labels={labels} video={video} active navigate={choose} reviewMode/></details>
   <ExportReview episode={episode} segments={segments} next={next}/>
  </section>
  <section className="editor-stage workflow-stage">
   <ReviewDeck video={video} episode={episode} segments={segments} edit={edit} controlsContainer={controls}/>
   {!segments.length&&episode.url&&<div className="workspace-media"><video src={episode.url} crossOrigin="anonymous" controls preload="metadata"/></div>}
  </section>
  <section className="editor-timeline workflow-details"><details><summary>Object tracking review</summary><TrackReview episode={episode} continueTracking={()=>choose('tracking')}/></details></section>
 </WorkspaceLayout>;
}
