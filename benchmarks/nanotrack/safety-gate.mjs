// Conservative experiment, not an object-presence detector or calibrated confidence.
export class SafetyGate{
 constructor(){this.canvas=new OffscreenCanvas(32,32);this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});this.stopped=true;this.reason='Confirm an initial box.';}
 signature(image,box){
  const [x,y,w,h]=box;this.ctx.clearRect(0,0,32,32);this.ctx.drawImage(image,x,y,w,h,0,0,32,32);
  const pixels=this.ctx.getImageData(0,0,32,32).data,hist=new Float32Array(88);
  for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],sum=Math.max(1,r+g+b);hist[Math.min(7,r>>5)]++;hist[8+Math.min(7,g>>5)]++;hist[16+Math.min(7,b>>5)]++;hist[24+Math.min(7,Math.floor(r/sum*8))*8+Math.min(7,Math.floor(g/sum*8))]++;}
  for(let i=0;i<hist.length;i++)hist[i]/=1024;return hist;
 }
 confirm(image,box,{confirmed=false}={}){
  if(!confirmed)throw Error('Explicit box confirmation is required to start or resume.');
  if(!this.valid(image,box))throw Error('Confirm a box inside this frame.');
  this.reference=this.signature(image,box);this.last=[...box];this.stopped=false;this.reason=null;
 }
 valid(image,box){return Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&box[0]>=0&&box[1]>=0&&box[2]>0&&box[3]>0&&box[0]+box[2]<=image.width&&box[1]+box[3]<=image.height;}
 evaluate(image,raw){
  if(this.stopped)return {proposal:null,reason:this.reason,appearance:null,requiresConfirmation:true};
  let reason=null,appearance=null;
  if(!this.valid(image,raw.box))reason='Outline left the frame or became invalid.';
  else if(!Number.isFinite(raw.score)||raw.score<.8)reason='Tracker response dropped.';
  else if(raw.ambiguous)reason='More than one similar outline is plausible. Confirm the object.';
  else{
   const b=raw.box,last=this.last,ratio=b[2]*b[3]/(last[2]*last[3]),distance=Math.hypot(b[0]+b[2]/2-last[0]-last[2]/2,b[1]+b[3]/2-last[1]-last[3]/2);
   const current=this.signature(image,b);let colour=0,chroma=0;for(let i=0;i<current.length;i++){const overlap=Math.sqrt(current[i]*this.reference[i]);if(i<24)colour+=overlap;else chroma+=overlap;}appearance=(colour/3+chroma)/2;
   if(ratio<.5||ratio>2||distance>Math.max(last[2],last[3])*.5)reason='Outline changed abruptly.';
   else if(appearance<.85)reason='Object appearance no longer matches the confirmed frame.';
  }
  if(reason){this.stopped=true;this.reason=reason;return {proposal:null,reason,appearance,requiresConfirmation:true};}
  this.last=[...raw.box];return {proposal:[...raw.box],reason:null,appearance,requiresConfirmation:false};
 }
}
