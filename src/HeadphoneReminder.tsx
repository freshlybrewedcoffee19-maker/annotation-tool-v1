import {useEffect,useId,useRef,useState} from 'react';
import './headphone-reminder.css';

type Workflow='annotation'|'marketing';
const reminderKeys={annotation:'cv-headphones-annotation',marketing:'cv-headphones-marketing'};

function wasDismissed(workflow:Workflow){
 try{return sessionStorage.getItem(reminderKeys[workflow])==='dismissed';}catch{return false;}
}

/** Keep this hook mounted on public/sign-in screens too, so sign-out resets the reminder. */
export function useHeadphoneReminder({workflow,isAuthenticated,isLoading}:{workflow:Workflow;isAuthenticated:boolean;isLoading:boolean}){
 const [dismissed,setDismissed]=useState(()=>wasDismissed(workflow));
 useEffect(()=>{
  if(isLoading||isAuthenticated)return;
  try{Object.values(reminderKeys).forEach(key=>sessionStorage.removeItem(key));}catch{/* The reminder still works when browser storage is unavailable. */}
  setDismissed(false);
 },[isAuthenticated,isLoading]);
 function dismiss(){
  try{sessionStorage.setItem(reminderKeys[workflow],'dismissed');}catch{/* Keep dismissal in memory for this visit. */}
  setDismissed(true);
 }
 return isAuthenticated&&!isLoading&&!dismissed?<HeadphoneReminder workflow={workflow} dismiss={dismiss}/>:null;
}

function HeadphoneReminder({workflow,dismiss}:{workflow:Workflow;dismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId(),description=useId();
 useEffect(()=>{
  const element=dialog.current,previous=document.activeElement;
  if(element&&!element.open)element.showModal();
  return()=>{
   element?.close();
   if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});
  };
 },[]);
 return <dialog ref={dialog} className={`headphone-reminder headphone-reminder--${workflow}`} aria-labelledby={title} aria-describedby={description} onCancel={event=>{event.preventDefault();dismiss();}}>
  <span className="headphone-reminder-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18v-3a11 11 0 0 1 22 0v3"/><rect x="4" y="16" width="6" height="11" rx="3"/><rect x="22" y="16" width="6" height="11" rx="3"/></svg></span>
  <h2 id={title}>Headphones on?</h2>
  <p id={description}>Use headphones or earphones so the mic hears your voice clearly, without picking up the video’s sound.</p>
  <button className="headphone-reminder-continue" type="button" autoFocus onClick={dismiss}>Got it</button>
 </dialog>;
}
