import {useState,type ReactNode} from 'react';
import type {Activity} from './ActivityNavigation';
import {WorkspaceLayout} from './WorkspaceLayout';

export function UploadWorkspace({controls,source,choose,details,mediaType='video'}:{controls:ReactNode;source?:string|null;choose:(activity:Activity)=>void;details?:ReactNode;mediaType?:'image'|'video'}){
 const [collapsed,setCollapsed]=useState(false);
 return <WorkspaceLayout choose={choose} collapsed={collapsed} toggle={()=>setCollapsed(v=>!v)} title="Upload media" mediaType={mediaType}>
  <section className="editor-toolrail workflow-controls" aria-label="Upload controls">{controls}</section>
  <section className="editor-stage workflow-stage"><div className="workspace-media">{source?mediaType==='image'?<img src={source} alt="Selected image"/>:<video src={source} crossOrigin="anonymous" controls preload="metadata"/>:<div className="workspace-placeholder"><h2>Your media starts here</h2><p>Upload a video or image to start annotating directly.</p></div>}</div></section>
  <section className="editor-timeline workflow-details">{details}</section>
 </WorkspaceLayout>;
}
