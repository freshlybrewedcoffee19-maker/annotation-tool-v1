export type Interval={start_sec:number;end_sec:number};
export function coverage(duration:number,segments:Interval[]){
 const changes=new Map<number,number>([[0,0],[duration,0]]);
 for(const row of segments){const start=Math.max(0,Math.min(duration,row.start_sec)),end=Math.max(0,Math.min(duration,row.end_sec));if(end<=start)continue;changes.set(start,(changes.get(start)??0)+1);changes.set(end,(changes.get(end)??0)-1);}
 const gaps:Interval[]=[],overlaps:Interval[]=[];let count=0,previous=0,covered=0;
 function append(list:Interval[],start:number,end:number){const last=list.at(-1);if(last?.end_sec===start)last.end_sec=end;else list.push({start_sec:start,end_sec:end});}
 for(const [time,change] of [...changes].sort((a,b)=>a[0]-b[0])){if(time>previous){if(count===0)append(gaps,previous,time);else covered+=time-previous;if(count>1)append(overlaps,previous,time);}count+=change;previous=time;}
 return {covered,unannotated:duration-covered,percent:duration?covered/duration*100:0,gaps,overlaps,pass:gaps.length===0&&overlaps.length===0};
}
