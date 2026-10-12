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
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const query=matchMedia("(max-width:600px)");const sync=()=>setMobile(query.matches);sync();query.addEventListener("change",sync);return()=>query.removeEventListener("change",sync);},[]);
 const stage=time<4?'clicking':time<6?'arrival':time<20?'speaking':'ending';
 const cue=time<9?'start':time<12?'stop':time<14?'label':'saved';
 const speech=cue==='start'?'“Start.”':cue==='stop'?'“Stop.”':cue==='label'?'“Walking.”':'“Walking.”';
 return <figure ref={host} className="vox-story film-story" data-stage={stage} data-cue={cue} data-paused={!visible||reduced} aria-label="A person switches from repeated mouse clicks to relaxed voice annotation with Cheddar Vox.">
  <div className="vox-story-scene">
   <svg viewBox={mobile?"210 -50 500 500":"0 0 900 380"} role="img" aria-label={stage==='clicking'?'A person repeatedly clicking at their desktop':stage==='ending'?'Use voice to annotate videos':'A relaxed person speaking to Cheddar Vox on their desktop'}>
    <rect x="-900" y="-900" width="2700" height="2700" fill="#edf0ef"/>
    <defs>
     <clipPath id="film-monitor"><polygon points="519,84 668,63 665,161 516,168"/></clipPath>
     <clipPath id="film-mouth"><ellipse cx="312" cy="115" rx="13" ry="10"/></clipPath>
     <clipPath id="film-hand"><path d="M427 178h65v22h-65z"/></clipPath>
    </defs>
    <image href="/images/office-clicking-branded-2d.png" width="900" height="380" preserveAspectRatio="none"/>
    <image className="film-click-hand" clipPath="url(#film-hand)" href="/images/office-clicking-branded-2d.png" width="900" height="380" preserveAspectRatio="none"/>
    <image className="film-relaxed" href="/images/office-relaxed-2d.png" width="900" height="380" preserveAspectRatio="none"/>
    <image className="film-talking" clipPath="url(#film-mouth)" href="/images/office-speaking-2d.png" width="900" height="380" preserveAspectRatio="none"/>
    <foreignObject x="0" y="0" width="900" height="380" className="film-monitor-surface"><div className="film-monitor-plane" style={{transform: "matrix3d(0.2980687269611294,-0.15918889681059942,0,-0.0007796762394415719,-0.014012743708175176,0.7822594167771832,0,0.00002667642261550891,0,0,1,0,519,84,0,1)"}}>
     <svg width="183" height="108" viewBox="500 114 183 108"><rect x="500" y="114" width="183" height="108" fill="#fffdf8"/>
    <g className="story-video">
     <rect x="508" y="122" width="167" height="76" rx="3" fill="#dbeafe"/>
     <path d="M508 181h167v17H508z" fill="#e6dfce"/><path d="M508 187h167" stroke="#b1c5b9"/>
     <g className="story-walker" transform="translate(0 0)">
      <ellipse cx="584" cy="190" rx="18" ry="3" fill="#afc1b7"/>
      <path className="walker-leg-a" d="M581 166l-7 12-4 10" stroke="#263951" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path className="walker-leg-b" d="M587 166l5 12 6 9" stroke="#172033" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path className="walker-arm-a" d="M580 150l-7 8-5-1" stroke="#e6aa80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M579 146q6-3 12 1l2 20q-8 4-17 0z" fill="#172033"/>
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

     </svg></div></foreignObject>
    <g className="film-click-words" fill="#172033" fontWeight="700" fontSize="17"><text x="431" y="156">click</text><text x="488" y="222">click</text><text x="364" y="208">click</text></g>
    <g className="story-speech"><rect x="255" y="22" width="206" height="45" rx="22" fill="#ffcd38" stroke="#172033" strokeWidth="1.5"/><path d="M292 66l-10 15 26-15" fill="#ffcd38"/><text x="357" y="51" textAnchor="middle" fontSize="20" fontWeight="700" fill="#172033">{speech}</text><path className="story-waves" d="M334 103q13 9 0 18m10-26q24 17 0 34" stroke="#315bea" strokeWidth="3" fill="none" strokeLinecap="round"/></g>
   </svg>
   <div className="story-ending"><h2>Use voice to<br/>annotate videos.</h2><div className="story-end-wave" aria-hidden="true">{[12,24,38,22,46,30,18,34,14].map((h,i)=><i key={i} style={{height:h,animationDelay:`${i*.08}s`}}/>)}</div></div>
  </div>

 </figure>;
}




