// Browser port of NanoTrack V3, pinned upstream 248663fde6bf7c40190cf10ee396d5662919ecd3. Apache-2.0.
import type * as ORT from 'onnxruntime-web';
type Box=[number,number,number,number];
type Candidate={cx:number;cy:number;w:number;h:number;score:number;penalty:number};
export class Tracker{
 ort:typeof ORT;backbone:ORT.InferenceSession;template:ORT.InferenceSession;head:ORT.InferenceSession;sizeLearningRate:number;displaySizeLearningRate:number;canvas:OffscreenCanvas;average="";cx=0;cy=0;w=0;h=0;displayW=0;displayH=0;z!:ORT.Tensor;
 constructor(ort:typeof ORT,backbone:ORT.InferenceSession,template:ORT.InferenceSession,head:ORT.InferenceSession,{sizeLearningRate=.348,displaySizeLearningRate=sizeLearningRate}:{sizeLearningRate?:number;displaySizeLearningRate?:number}={}){for(const rate of [sizeLearningRate,displaySizeLearningRate])if(!Number.isFinite(rate)||rate<.1||rate>1)throw Error('Choose a box-size adjustment rate between 0.1 and 1.');this.ort=ort;this.backbone=backbone;this.template=template;this.head=head;this.sizeLearningRate=sizeLearningRate;this.displaySizeLearningRate=displaySizeLearningRate;this.canvas=new OffscreenCanvas(255,255);}
 crop(image:ImageBitmap,n:number,side:number){
  const c=this.canvas;c.width=n;c.height=n;const ctx=c.getContext('2d',{willReadFrequently:true})!;
  ctx.fillStyle=this.average;ctx.fillRect(0,0,n,n);
  const left=Math.floor(this.cx-(side+1)/2+.5),top=Math.floor(this.cy-(side+1)/2+.5);
  ctx.drawImage(image,(0-left)*n/side,(0-top)*n/side,image.width*n/side,image.height*n/side);
  const pixels=ctx.getImageData(0,0,n,n).data,data=new Float32Array(3*n*n);
  for(let i=0;i<n*n;i++){data[i]=pixels[i*4+2];data[n*n+i]=pixels[i*4+1];data[2*n*n+i]=pixels[i*4];}
  return new this.ort.Tensor('float32',data,[1,3,n,n]);
 }
 async init(image:ImageBitmap,box:Box){
  const [x,y,w,h]=box;Object.assign(this,{cx:x+(w-1)/2,cy:y+(h-1)/2,w,h,displayW:w,displayH:h});
  const c=new OffscreenCanvas(image.width,image.height),ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data,s=[0,0,0];
  for(let i=0;i<pixels.length;i+=4)for(let j=0;j<3;j++)s[j]+=pixels[i+j];this.average=`rgb(${s.map(v=>v/(pixels.length/4)).join(',')})`;
  const side=Math.round(Math.sqrt((w+.5*(w+h))*(h+.5*(w+h))));const input=this.crop(image,127,side);this.z=(await this.template.run({input})).output;input.dispose();
 }
 async track(image:ImageBitmap){
  const scale=127/Math.sqrt((this.w+.5*(this.w+this.h))*(this.h+.5*(this.w+this.h)));
  const input=this.crop(image,255,Math.round(255/scale));const x=(await this.backbone.run({input})).output;input.dispose();
  const out=await this.head.run({input1:this.z,input2:x});x.dispose();const cls=out.output1.data as Float32Array,loc=out.output2.data as Float32Array;
  const sz=(w:number,h:number)=>Math.sqrt((w+(w+h)/2)*(h+(w+h)/2)),change=(r:number)=>Math.max(r,1/r);let best=-Infinity,pick:Candidate|undefined;const candidates:Candidate[]=[];
  for(let i=0;i<225;i++){
   const px=(i%15-7)*16,py=(Math.floor(i/15)-7)*16,l=loc[i],t=loc[225+i],r=loc[450+i],b=loc[675+i],w=l+r,h=t+b;
   const score=1/(1+Math.exp(cls[i]-cls[225+i]));const penalty=Math.exp(-(change(sz(w,h)/sz(this.w*scale,this.h*scale))*change((this.w/this.h)/(w/h))-1)*.138);
   const window=(.5-.5*Math.cos(2*Math.PI*(i%15)/14))*(.5-.5*Math.cos(2*Math.PI*Math.floor(i/15)/14));const rank=penalty*score*(1-.455)+window*.455;
   if(score>=.9&&penalty>.8)candidates.push({penalty,cx:(px+(r-l)/2)/scale,cy:(py+(b-t)/2)/scale,w:w/scale,h:h/scale,score});
   if(rank>best){best=rank;pick={cx:(px+(r-l)/2)/scale,cy:(py+(b-t)/2)/scale,w:w/scale,h:h/scale,score,penalty};}
  }
  out.output1.dispose();out.output2.dispose();if(!pick) return {box:null,displayBox:null,score:0,ambiguous:false};const lr=pick.penalty*pick.score*this.sizeLearningRate;
  const overlap=(a:Omit<Candidate,"penalty">,b:Omit<Candidate,"penalty">)=>{const intersection=Math.max(0,Math.min(a.cx+a.w/2,b.cx+b.w/2)-Math.max(a.cx-a.w/2,b.cx-b.w/2))*Math.max(0,Math.min(a.cy+a.h/2,b.cy+b.h/2)-Math.max(a.cy-a.h/2,b.cy-b.h/2));return intersection/(a.w*a.h+b.w*b.h-intersection);};
  const ambiguousCandidates=candidates.filter(c=>c.score>=pick.score*.95&&overlap(c,pick)<.5&&c.w>0&&c.h>0&&c.w*c.h>pick.w*pick.h*.5&&c.w*c.h<pick.w*pick.h*2).map(c=>({box:[this.cx+c.cx-c.w/2,this.cy+c.cy-c.h/2,c.w,c.h],score:c.score,overlap:overlap(c,pick)}));
  const ambiguous=ambiguousCandidates.length>0;
  this.cx=Math.max(0,Math.min(image.width,this.cx+pick.cx));this.cy=Math.max(0,Math.min(image.height,this.cy+pick.cy));
  this.w=Math.max(10,Math.min(image.width,this.w*(1-lr)+pick.w*lr));this.h=Math.max(10,Math.min(image.height,this.h*(1-lr)+pick.h*lr));
  // Display adaptation must not change the search crop or competing-candidate checks.
  const displayLr=pick.penalty*pick.score*this.displaySizeLearningRate;
  this.displayW=Math.max(10,Math.min(image.width,this.displayW*(1-displayLr)+pick.w*displayLr));this.displayH=Math.max(10,Math.min(image.height,this.displayH*(1-displayLr)+pick.h*displayLr));
  return {box:[this.cx-this.w/2,this.cy-this.h/2,this.w,this.h] as Box,displayBox:[this.cx-this.displayW/2,this.cy-this.displayH/2,this.displayW,this.displayH] as Box,score:pick.score,ambiguous,ambiguousCandidates};
 }
}
