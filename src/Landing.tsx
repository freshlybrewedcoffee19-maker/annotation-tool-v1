import {useEffect, useRef, useState} from 'react';
import frames from './home-frames.json';
export function Landing({own,trial,busy,error,services}:{services:()=>void;own:()=>void;trial:()=>void;resume?:()=>void;busy:boolean;error:string}){
 const [centre,setCentre]=useState(2);
 const [phone,setPhone]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(false);
 const [touching,setTouching]=useState(false);
 const [pageVisible,setPageVisible]=useState(true);
 const gesture=useRef<{id:number;x:number;y:number}|null>(null);
 useEffect(()=>{
  const narrow=window.matchMedia('(max-width: 767px)');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>{setPhone(narrow.matches);setReducedMotion(reduced.matches);if(reduced.matches)setCentre(2);};
  const visibility=()=>setPageVisible(!document.hidden);
  sync();visibility();
  narrow.addEventListener('change',sync);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);
  return ()=>{narrow.removeEventListener('change',sync);reduced.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  if(!phone||reducedMotion||touching||!pageVisible)return;
  const timer=window.setTimeout(()=>setCentre(value=>(value+1)%frames.length),3000);
  return ()=>window.clearTimeout(timer);
 },[centre,phone,reducedMotion,touching,pageVisible]);
 const finishGesture=(event:React.PointerEvent<HTMLDivElement>,cancelled=false)=>{
  const start=gesture.current;
  if(!start||start.id!==event.pointerId)return;
  gesture.current=null;setTouching(false);
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(!cancelled&&Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy))setCentre(value=>(value+(dx<0?1:frames.length-1))%frames.length);
 };
 return <main className="landing"><header className="brand-header"><span className="brand">Cheddar Vox</span><nav aria-label="Main navigation"><button className="home-sign-in" onClick={own}>Sign in</button></nav></header><section className="hero"><h1>Label time segments in videos by voice.</h1><p className="hero-description">Say start and stop while it plays. The time saves itself.<br/>Then say an action label.</p><div className="hero-media" aria-hidden="true" data-centre={centre} onPointerDown={event=>{
  if(!phone||reducedMotion||gesture.current)return;
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY};setTouching(true);event.currentTarget.setPointerCapture(event.pointerId);
 }} onPointerUp={event=>finishGesture(event)} onPointerCancel={event=>finishGesture(event,true)} onLostPointerCapture={event=>finishGesture(event,true)}>{frames.map((frame,i)=><div className={`film-card film-${i}`} key={frame.time} data-arc-slot={((i-centre+frames.length+2)%frames.length)-2} style={{backgroundImage:`url("${frame.placeholder}")`}} data-sample-time={frame.time}><img src={frame.src} alt="" width="480" height="600" draggable={false} fetchPriority={i===2?'high':'auto'} onError={event=>{event.currentTarget.style.visibility='hidden';}}/>{i===2?<span className="film-result"><small>Example result</small><b>start 0:04 · stop 0:09</b><em>grasp cloth</em></span>:<span>{['Find the moment','Mark the action','Label by voice','Review each clip','Keep what counts'][i]}</span>}</div>)}</div><div className="hero-actions"><div className="sample-cta-group"><button className="sprint-button sample-cta" disabled={busy} onClick={trial}>Try a sample video</button></div><button className="sprint-button secondary" disabled={busy} onClick={own}>Use my own video</button></div><p className="home-services">Need a labelled dataset instead? <button onClick={services}>Dataset services</button></p>{error&&<p className="error" role="alert">{error}</p>}<p className="hero-note">Export action labels with start and end times as CSV or JSON.<br/>Try the demo without an account. Sign in to save your own videos.</p></section><footer className="landing-footer"><span>Built around your footage.</span><span>Review each clip before exporting.</span><nav aria-label="Legal"><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of use</a></nav></footer></main>;
}
