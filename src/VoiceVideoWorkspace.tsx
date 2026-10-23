import {useRef,type ReactNode,type RefObject} from 'react';
import type {Id} from '../convex/_generated/dataModel';
import type {Activity} from './ActivityNavigation';
import {VIDEO_ACTIVITIES} from './annotation-interface';
import {VideoAnnotationWorkspace} from './VideoAnnotationWorkspace';
import './object-boxes.css';

// Reuse the established player, mic and timeline without mounting drawing tools.
export function VoiceVideoWorkspace({episodeId,video,children,active,frameRate,sidebar,timeline,tools,activity='actions',chooseActivity,guide,trialMode=false,savedAnnotations}:{
 episodeId:Id<'episodes'>;video:RefObject<HTMLVideoElement|null>;children:ReactNode;active:boolean;
 frameRate?:number|null;sidebar?:ReactNode;timeline?:ReactNode;tools?:ReactNode;activity?:Activity;
 chooseActivity?:(activity:Activity)=>void;guide?:ReactNode;trialMode?:boolean;savedAnnotations?:ReactNode;
}){
 const host=useRef<HTMLDivElement>(null);
 return <VideoAnnotationWorkspace host={host} activity={activity} chooseActivity={chooseActivity}
  trialMode={trialMode} sidebar={sidebar} tools={tools} timeline={timeline} guide={guide}
  savedAnnotations={savedAnnotations} toolItems={VIDEO_ACTIVITIES}
  playback={{video,frameRate,trialMode,episodeId,active,videoOnly:true}}
 >{children}</VideoAnnotationWorkspace>;
}
