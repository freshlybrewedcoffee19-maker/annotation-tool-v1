export const steps=['upload','annotate','export'] as const;
export type Step=typeof steps[number];
export function StepNavigation({step,hasVideo,change}:{step:Step;hasVideo:boolean;change:(step:Step)=>void}){
 return <nav className="step-navigation" aria-label="Annotation steps"><div role="tablist" aria-label="Workflow">{steps.map((item,index)=><button key={item} id={`tab-${item}`} type="button" role="tab" aria-label={item[0].toUpperCase()+item.slice(1)} aria-controls={`panel-${item}`} aria-selected={step===item} tabIndex={step===item?0:-1} disabled={!hasVideo&&index>0} onClick={()=>change(item)} onKeyDown={event=>{
  const key=event.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;event.preventDefault();const available:readonly Step[]=hasVideo?steps:[steps[0]];const current=available.indexOf(item);const next=key==='Home'?0:key==='End'?available.length-1:(current+(key==='ArrowRight'?1:-1)+available.length)%available.length;change(available[next]);document.getElementById(`tab-${available[next]}`)?.focus();
 }}><span>{index+1}</span>{item==='export'?'Review & export':item[0].toUpperCase()+item.slice(1)}</button>)}</div></nav>;
}
