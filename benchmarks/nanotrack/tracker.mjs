// Experimental browser port of pinned NanoTracker/configv3; raw proposals only.
export class Tracker{
 constructor(ort,backbone,template,head){Object.assign(this,{ort,backbone,template,head});this.canvas=new OffscreenCanvas(255,255);}
 crop(image,n,side){
  const c=this.canvas;c.width=n;c.height=n;const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle=this.average;ctx.fillRect(0,0,n,n);
  const left=Math.floor(this.cx-(side+1)/2+.5),top=Math.floor(this.cy-(side+1)/2+.5);
  ctx.drawImage(image,(0-left)*n/side,(0-top)*n/side,image.width*n/side,image.height*n/side);
  const pixels=ctx.getImageData(0,0,n,n).data,data=new Float32Array(3*n*n);
  for(let i=0;i<n*n;i++){data[i]=pixels[i*4+2];data[n*n+i]=pixels[i*4+1];data[2*n*n+i]=pixels[i*4];}
  return new this.ort.Tensor('float32',data,[1,3,n,n]);
 }
 async init(image,box){
  const [x,y,w,h]=box;Object.assign(this,{cx:x+(w-1)/2,cy:y+(h-1)/2,w,h});
  const c=new OffscreenCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data,s=[0,0,0];
  for(let i=0;i<pixels.length;i+=4)for(let j=0;j<3;j++)s[j]+=pixels[i+j];this.average=`rgb(${s.map(v=>v/(pixels.length/4)).join(',')})`;
  const side=Math.round(Math.sqrt((w+.5*(w+h))*(h+.5*(w+h))));this.z=(await this.template.run({input:this.crop(image,127,side)})).output;
 }
 async track(image){
  const scale=127/Math.sqrt((this.w+.5*(this.w+this.h))*(this.h+.5*(this.w+this.h)));
  const x=(await this.backbone.run({input:this.crop(image,255,Math.round(255/scale))})).output;
  const out=await this.head.run({input1:this.z,input2:x});const cls=out.output1.data,loc=out.output2.data;
  const sz=(w,h)=>Math.sqrt((w+(w+h)/2)*(h+(w+h)/2)),change=r=>Math.max(r,1/r);let best=-Infinity,pick;
  for(let i=0;i<225;i++){
   const px=(i%15-7)*16,py=(Math.floor(i/15)-7)*16,l=loc[i],t=loc[225+i],r=loc[450+i],b=loc[675+i],w=l+r,h=t+b;
   const score=1/(1+Math.exp(cls[i]-cls[225+i]));const penalty=Math.exp(-(change(sz(w,h)/sz(this.w*scale,this.h*scale))*change((this.w/this.h)/(w/h))-1)*.138);
   const window=(.5-.5*Math.cos(2*Math.PI*(i%15)/14))*(.5-.5*Math.cos(2*Math.PI*Math.floor(i/15)/14));const rank=penalty*score*(1-.455)+window*.455;
   if(rank>best){best=rank;pick={cx:(px+(r-l)/2)/scale,cy:(py+(b-t)/2)/scale,w:w/scale,h:h/scale,score,penalty};}
  }
  if(!pick) return {box:null,score:0};const lr=pick.penalty*pick.score*.348;
  this.cx=Math.max(0,Math.min(image.width,this.cx+pick.cx));this.cy=Math.max(0,Math.min(image.height,this.cy+pick.cy));
  this.w=Math.max(10,Math.min(image.width,this.w*(1-lr)+pick.w*lr));this.h=Math.max(10,Math.min(image.height,this.h*(1-lr)+pick.h*lr));
  return {box:[this.cx-this.w/2,this.cy-this.h/2,this.w,this.h],score:pick.score};
 }
}
