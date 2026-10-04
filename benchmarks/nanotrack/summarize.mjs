import fs from 'node:fs/promises';
const rows=JSON.parse(await fs.readFile('benchmarks/nanotrack/tracking-results.json','utf8'));
const iou=(a,b)=>{if(!a||!b)return 0;const w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])),h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return w*h/(a[2]*a[3]+b[2]*b[3]-w*h);};
const summary=rows.map(run=>({channel:run.channel,provider:run.provider,adapter:run.adapter,loadMs:run.loadMs,maxTickGap:run.maxTickGap,remoteRequests:run.remoteRequests,cases:run.cases?.map(c=>{
 const truth=run.truths[c.name],visible=c.rows.filter(r=>truth[r.index].state==='visible'),absent=c.rows.filter(r=>truth[r.index].state==='absent');
 const real=c.name==='trial'?c.rows.filter(r=>r.index%10===0):[];
 return {name:c.name,processingMs:c.processingMs,meanInferenceMs:c.rows.reduce((s,r)=>s+r.inferenceMs,0)/50,meanVisibleIoU:visible.length?visible.reduce((s,r)=>s+iou(r.raw.box,truth[r.index].box),0)/visible.length:null,handCheckedTrialIoU:real.length?real.map(r=>({time:2+r.index*.2,iou:iou(r.raw.box,[70,7,231,308])})):null,absentFrames:absent.length,absentHighScoreProposals:absent.filter(r=>r.raw.score>=.8).length,firstHeuristicStop:c.rows.find(r=>r.heuristicStopped)?.index??null,acceptedBoxes:c.rows.filter(r=>r.acceptedBox!==null).length,lookalikeSwitches:c.name==='lookalike'?c.rows.filter(r=>iou(r.raw.box,[350-r.index*2,100,92,124])>iou(r.raw.box,truth[r.index].box)).length:null};
 })}));
await fs.writeFile('benchmarks/nanotrack/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
