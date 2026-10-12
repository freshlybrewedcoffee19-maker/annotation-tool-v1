import {useState,type ReactNode} from 'react';
import type {Activity} from './ActivityNavigation';
import {WorkspaceLayout} from './WorkspaceLayout';

export function UploadWorkspace({controls,source,choose,details}:{controls:ReactNode;source?:string|null;choose:(activity:Activity)=>void;details?:ReactNode}){
 const [collapsed,setCollapsed]=useState(false);
 return <WorkspaceLayout choose={choose} collapsed={collapsed} toggle={()=>setCollapsed(v=>!v)} title="Upload video">
  <section className="editor-toolrail workflow-controls" aria-label="Upload controls">{controls}</section>
  <section className="editor-stage workflow-stage"><div className="workspace-media">{source?<video src={source} crossOrigin="anonymous" controls preload="metadata"/>:<div className="workspace-placeholder"><h2>Your video starts here</h2><p>Upload a video to start annotating directly.</p></div>}</div></section>
  <section className="editor-timeline workflow-details">{details}</section>
 </WorkspaceLayout>;
}
