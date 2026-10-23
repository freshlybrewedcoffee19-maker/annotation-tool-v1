import {useState,type ComponentProps,type KeyboardEventHandler,type ReactNode,type RefObject} from 'react';
import {WorkspaceLayout} from './WorkspaceLayout';
import {EditorPlayback} from './EditorPlayback';
import type {Activity} from './ActivityNavigation';

type Props={
 activity?:Activity;
 chooseActivity?:(activity:Activity)=>void;
 trialMode?:boolean;
 mediaType?:'video'|'image';
 host:RefObject<HTMLDivElement|null>;
 children:ReactNode;
 overlay?:ReactNode;
 playback?:ComponentProps<typeof EditorPlayback>;
 stageTools?:ReactNode;
 toolrail?:ReactNode;
 sidebar?:ReactNode;
 tools?:ReactNode;
 timeline?:ReactNode;
 guide?:ReactNode;
 savedAnnotations?:ReactNode;
 onKeyDown?:KeyboardEventHandler<HTMLDivElement>;
};

// Shared player layout. Drawing state and tool-specific saves stay in ObjectBoxes;
// voice, timeline and media children keep their existing owners and callbacks.
export function VideoAnnotationWorkspace({activity='actions',chooseActivity,trialMode=false,mediaType='video',host,children,overlay,playback,stageTools,toolrail,sidebar,tools,timeline,guide,savedAnnotations,onKeyDown}:Props){
 const [savedCollapsed,setSavedCollapsed]=useState(false);
 const [toolPanelCollapsed,setToolPanelCollapsed]=useState(false);
 const image=mediaType==='image';
 return <WorkspaceLayout
  activity={activity}
  choose={id=>{setToolPanelCollapsed(false);chooseActivity?.(id);}}
  collapsed={toolPanelCollapsed}
  toggle={()=>setToolPanelCollapsed(v=>!v)}
  title="Annotation workspace"
  help={activity==='actions'?guide:undefined}
  trial={trialMode}
  mediaType={mediaType}
  className={`${image?'image-workspace':''} ${trialMode?'trial-rearranged selected-'+activity:''} ${savedCollapsed?'saved-collapsed':''}`}
  onKeyDown={onKeyDown}
 >
  {trialMode&&<section className="trial-top-guide"><h2>Try annotation</h2>{activity==='actions'&&guide}</section>}
  <section className="editor-stage">
   {!trialMode&&activity!=='actions'&&guide}
   <div ref={host} className="box-video">{children}{overlay}</div>
   {playback&&<EditorPlayback {...playback}/>}
   {stageTools}
  </section>
  {toolrail}
  <section className="editor-inspector" aria-label="Microphone controls">
   {sidebar}
   {!image&&!trialMode&&activity==='actions'&&<div className="signed-action-options">{tools}</div>}
  </section>
  {trialMode&&<aside className="trial-saved-column" aria-label="Saved annotations">
   <button type="button" className="panel-header-toggle" aria-label={savedCollapsed?'Expand Saved annotations panel':'Collapse Saved annotations panel'} aria-expanded={!savedCollapsed} onClick={()=>setSavedCollapsed(v=>!v)}>
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={savedCollapsed?'m13 9 3 3-3 3':'m16 9-3 3 3 3'}/></svg>
   </button>
   <div className="saved-panel-content">{savedAnnotations}</div>
  </aside>}
  {timeline}
 </WorkspaceLayout>;
}
