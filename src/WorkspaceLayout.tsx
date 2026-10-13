import type {ReactNode} from 'react';
import type {Activity} from './ActivityNavigation';
import {WorkspaceToolRail} from './WorkspaceToolRail';

// The same frame owns navigation and panel sizing in every workflow stage.
export function WorkspaceLayout({activity,choose,collapsed,toggle,title,help,children,className='',trial=false,mediaType='video',onKeyDown,toolItems,toolLabels}:{activity?:Activity;choose?:(activity:Activity)=>void;collapsed:boolean;toggle:()=>void;title:string;help?:ReactNode;children:ReactNode;className?:string;trial?:boolean;mediaType?:'image'|'video';onKeyDown?:React.KeyboardEventHandler<HTMLDivElement>;toolItems?:Activity[];toolLabels?:Partial<Record<Activity,string>>}){
 return <div className={`object-editor editor-grid ${trial?'':`signed-editor workspace-frame selected-${activity??'upload'} ${collapsed?'tool-panel-collapsed':''}`} ${className}`} onKeyDown={onKeyDown}>
  {!trial&&<><WorkspaceToolRail activity={activity} choose={choose} mediaType={mediaType} items={toolItems} labels={toolLabels}/><button className="workspace-panel-toggle" aria-label={collapsed?'Expand tool controls':'Collapse tool controls'} aria-expanded={!collapsed} onClick={toggle}>{collapsed?'›':'‹'}</button><section className="trial-top-guide"><h2>{title}</h2>{help}</section></>}
  {children}
 </div>;
}
