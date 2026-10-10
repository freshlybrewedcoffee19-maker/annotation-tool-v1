import {useEffect, useRef, useState} from 'react';
import './home-animation.css';

export function HomeAnimation(){
 const host=useRef<HTMLElement>(null);
 const [time,setTime]=useState(0),[visible,setVisible]=useState(true),[reduced,setReduced]=useState(false);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>{setReduced(media.matches);if(media.matches)setTime(22);};sync();media.addEventListener('change',sync);
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));if(host.current)observer.observe(host.current);
  const visibility=()=>setVisible(!document.hidden && !!host.current && host.current.getBoundingClientRect().bottom>0);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',sync);observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{if(!visible||reduced)return;const tick=window.setTimeout(()=>setTime(t=>t>=24?0:t+.1),100);return()=>clearTimeout(tick);},[visible,reduced,time]);
 const stage=time<4?'clicking':time<6?'arrival':time<20?'speaking':'ending';
 const cue=time<9?'start':time<12?'stop':time<14?'label':'saved';
 const speech=cue==='start'?'“Start.”':cue==='stop'?'“Stop.”':cue==='label'?'“Walking.”':'“Walking.”';
 return <figure ref={host} className="vox-story" data-stage={stage} data-cue={cue} data-paused={!visible||reduced} aria-label="A person switches from repeated mouse clicks to relaxed voice annotation with Cheddar Vox.">
  <div className="vox-story-scene">
   <svg viewBox="0 0 900 380" role="img" aria-label={stage==='clicking'?'A person repeatedly clicking at their desktop':stage==='ending'?'Use voice to annotate videos':'A relaxed person speaking to Cheddar Vox on their desktop'}>
    <ellipse cx="450" cy="339" rx="302" ry="14" fill="#e6eaf0"/>
    <g className="story-office">
     <path d="M65 295h770" stroke="#d9e2ec" strokeWidth="2"/>
     <g>
     <rect x="95" y="65" width="145" height="160" rx="4" fill="#e1ecf7" stroke="#b7c9dc" strokeWidth="3"/>
     <path d="M109 211v-72h20v72m10 0V99h26v112m12 0v-52h18v52m10 0v-91h21v91" fill="#c4d6e7"/>
     <path d="M167 66v159M95 145h145" stroke="white" strokeWidth="5"/>

     </g>
     <g transform="translate(35 0)">
     <rect x="715" y="71" width="99" height="85" rx="4" fill="#fff" stroke="#c5cfdc" strokeWidth="2"/>
     <path d="M728 88h73M728 105h36m-36 14h57m-57 14h46" stroke="#b7c9dc" strokeWidth="4"/>
     <rect x="704" y="184" width="117" height="9" rx="3" fill="#8194ac"/>
     <path d="M720 181v-29h10v29m5 0v-35h12v35m6 0v-24h11v24" stroke="#315bea" strokeWidth="6"/>
     <path d="M785 182v-31m0 14q-28-27-17-31 24 1 17 31m0 0q1-30 20-25 5 18-20 25" fill="#85b69b"/>
     <path d="M774 174h23l-4 13h-15z" fill="#e6aa80"/>

     </g>
     <g className="story-coffee-counter" transform="translate(-172 0)">
      <path d="M99 265h146" stroke="#8194ac" strokeWidth="7" strokeLinecap="round"/>
      <path d="M110 269v64m124-64v64" stroke="#8194ac" strokeWidth="5"/>
      <path d="M110 301h124" stroke="#c5cfdc" strokeWidth="3"/>
      <ellipse cx="173" cy="261" rx="25" ry="3" fill="#d9e2ec"/>
      <rect x="160" y="239" width="23" height="22" rx="4" fill="#ffcd38"/>
      <path d="M184 243q15-1 9 12h-9" fill="none" stroke="#e6aa80" strokeWidth="3"/>
      <path d="M166 232q-5-5 0-10m9 10q-5-5 0-10" fill="none" stroke="#b7c9dc" strokeWidth="2" strokeLinecap="round"/>
     </g>
    </g>
    <g className="story-chair" stroke="#172033" strokeWidth="7" strokeLinecap="round" fill="none"><path d="M285 200v76q0 15 22 15h65M327 291v44m-32 0h65"/></g>
    <g className="story-person">
     <path d="M337 267l55 5-10 58m-38-57-13 57" stroke="#172033" strokeWidth="25" strokeLinejoin="round" fill="none"/>
     <path d="M327 330h-18m70 0h19" stroke="#172033" strokeWidth="13" strokeLinecap="round"/>
     <g className="story-upper">
      <path d="M325 201l-5 43 34 13" stroke="#1c665f" strokeWidth="17" strokeLinecap="round" fill="none"/>
      <path d="M316 181q25-17 49 2l16 79q-30 17-68-1z" fill="#27877e"/>
      <path d="M341 172v15" stroke="#e6aa80" strokeWidth="19"/>
      <ellipse cx="342" cy="145" rx="28" ry="33" fill="#f2bc94"/>
      <path d="M314 146q-11-46 29-42 34 0 29 33l-19-12-9 13-27-2z" fill="#172033"/>
      <circle cx="358" cy="145" r="2.5" fill="#172033"/>
      <path className="story-mouth" d="M355 159h9" fill="none" stroke="#172033" strokeWidth="3" strokeLinecap="round"/>
      <g className="story-arm">
       <path d="M352 199l31 36 61-2" stroke="#f2bc94" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
       <path d="M352 199l12 14" stroke="#27877e" strokeWidth="19" strokeLinecap="round"/>
       <path d="M426 227v13" stroke="#172033" strokeWidth="7" strokeLinecap="round"/>
       <rect x="421" y="228" width="10" height="11" rx="3" fill="#172033"/>
       <rect x="423" y="230" width="6" height="7" rx="1" fill="#e1ecf7"/>
      </g>

     </g>
    </g>
    <g stroke="#172033" strokeWidth="6" strokeLinejoin="round"><path d="M396 251h331M415 253v80m292-80v80" fill="none"/><path d="M589 233v16m-29 0h59" fill="none"/></g>
    <g className="story-desktop-monitor">
     <rect x="490" y="104" width="203" height="129" rx="10" fill="#172033" stroke="#172033" strokeWidth="6"/>
     <g>
    <rect x="500" y="114" width="183" height="108" rx="3" fill="#f5f7fb"/>
    <g className="story-video">
     <rect x="508" y="122" width="167" height="76" rx="3" fill="#dbe9f2"/>
     <path d="M508 181h167v17H508z" fill="#c4d6ce"/><path d="M508 187h167" stroke="#b1c5b9"/>
     <g className="story-walker" transform="translate(-209.2 0) scale(1.3 1)">
      <ellipse cx="584" cy="190" rx="18" ry="3" fill="#afc1b7"/>
      <path className="walker-leg-a" d="M581 166l-7 12-4 10" stroke="#263951" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path className="walker-leg-b" d="M587 166l5 12 6 9" stroke="#172033" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path className="walker-arm-a" d="M580 150l-7 8-5-1" stroke="#e6aa80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M579 146q6-3 12 1l2 20q-8 4-17 0z" fill="#315bea"/>
      <path d="M583 140v7" stroke="#e6aa80" strokeWidth="5"/>
      <ellipse cx="585" cy="136" rx="7" ry="8" fill="#f2bc94"/>
      <path d="M578 136q-3-12 7-11 9 0 8 8l-7-3-4 5z" fill="#172033"/>
      <circle cx="590" cy="136" r=".9" fill="#172033"/>
      <path className="walker-arm-b" d="M589 150l7 8 5-4" stroke="#f2bc94" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
     </g>
     <g className="story-segment">
      <rect x="508" y="198" width="167" height="24" fill="#f5f7fb"/>
      <path d="M518 197h146" stroke="#c5cfdc" strokeWidth="5" strokeLinecap="round"/>
      {stage==='speaking'&&<>
       <rect x="531" y="193" width={cue==='start'?Math.max(4,Math.min(112,(time-6)/3*112)):112} height="8" rx="3" fill="#ffcd38"/>
       <path d="M531 189v15" stroke="#172033" strokeWidth="2"/>
       {cue!=='start'&&<path d="M643 189v15" stroke="#172033" strokeWidth="2"/>}
       <text x="531" y="217" textAnchor="middle" fontSize="12" fill="#172033">0:04</text>
       {cue!=='start'&&<text x="643" y="217" textAnchor="middle" fontSize="12" fill="#172033">0:09</text>}
       <text x="627" y="152" textAnchor="middle" fontSize="10" fontWeight="700" fill={cue==='saved'?'#245c38':'#172033'}>{cue==='start'?'● Recording':cue==='stop'?'Marked':cue==='label'?'Walking':'✓ Walking saved'}</text>
      </>}
     </g>
    </g>
    <g className="story-new-screen"><rect x="500" y="114" width="183" height="108" rx="3" fill="#ffcd38"/><text x="591" y="155" textAnchor="middle" fill="#172033" fontSize="23" fontWeight="750">Cheddar Vox</text><text x="591" y="185" textAnchor="middle" fontSize="15" fill="#172033">Your voice takes over.</text></g>
    <g className="story-monitor-saved">
     <rect x="500" y="114" width="183" height="108" rx="3" fill="#e8f3eb"/>
     <circle cx="591" cy="139" r="11" fill="#245c38"/><path d="M585 139l4 4 8-8" stroke="white" strokeWidth="2.5" fill="none"/>
     <text x="591" y="166" textAnchor="middle" fontSize="18" fontWeight="700" fill="#172033">Walking</text>
     <text x="591" y="188" textAnchor="middle" fontSize="15" fill="#172033">0:04 – 0:09</text>
     <text x="591" y="207" textAnchor="middle" fontSize="12" fill="#245c38">Annotation saved</text>
    </g>
     </g>
    </g>
    <path d="M478 244h64" stroke="#8194ac" strokeWidth="5" strokeLinecap="round"/>
    <g className="story-mouse"><rect x="435" y="231" width="25" height="13" rx="7" fill="#172033"/><path d="M448 231v6" stroke="white" strokeWidth="2"/></g>
    <g className="story-clicks" fill="#172033" fontWeight="750"><text x="220" y="98" fontSize="25" transform="rotate(-12 220 98)">click</text><text x="387" y="125" fontSize="32" transform="rotate(10 387 125)">click</text><text x="245" y="218" fontSize="22" transform="rotate(-8 245 218)">click</text><text x="389" y="193" fontSize="22">click</text><text x="278" y="64" fontSize="19">click</text></g>
    <g className="story-mic">
     <rect x="455" y="190" width="13" height="25" rx="6.5" fill="#315bea" stroke="#172033" strokeWidth="2"/>
     <path d="M450 205v5q0 13 12 13t12-13v-5m-12 18v16m-10 0h20" stroke="#172033" strokeWidth="3" strokeLinecap="round" fill="none"/>
    </g>
    <g className="story-speech"><rect x="364" y="45" width="229" height="45" rx="22" fill="#ffcd38" stroke="#172033" strokeWidth="2"/><path d="M384 88l-10 16 26-15" fill="#ffcd38" stroke="#172033" strokeWidth="2"/><text x="479" y="74" textAnchor="middle" fontSize="19" fontWeight="700" fill="#172033">{speech}</text><path className="story-waves" d="M385 143q13 9 0 18m10-26q24 17 0 34" stroke="#315bea" strokeWidth="3" fill="none" strokeLinecap="round"/></g>
   </svg>
   <div className="story-ending"><span className="story-end-brand">Cheddar Vox</span><h2>Use voice to<br/>annotate videos.</h2><div className="story-end-wave" aria-hidden="true">{[12,24,38,22,46,30,18,34,14].map((h,i)=><i key={i} style={{height:h,animationDelay:`${i*.08}s`}}/>)}</div></div>
  </div>

 </figure>;
}
