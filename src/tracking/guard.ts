import {TrackingGuard,validTrackingBox,type TrackingBox,type TrackingRaw} from './rules';
export class ImageTrackingGuard{
 private canvas=new OffscreenCanvas(32,32);private context=this.canvas.getContext('2d',{willReadFrequently:true})!;private guard=new TrackingGuard();
 signature(image:ImageBitmap,box:TrackingBox){const ctx=this.context;ctx.clearRect(0,0,32,32);ctx.drawImage(image,...box,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data,hist=new Float32Array(88);for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],sum=Math.max(1,r+g+b);hist[Math.min(7,r>>5)]++;hist[8+Math.min(7,g>>5)]++;hist[16+Math.min(7,b>>5)]++;hist[24+Math.min(7,Math.floor(r/sum*8))*8+Math.min(7,Math.floor(g/sum*8))]++;}for(let i=0;i<88;i++)hist[i]/=1024;return hist;}
 confirm(image:ImageBitmap,box:TrackingBox){this.guard.confirm(box,this.signature(image,box),image.width,image.height,true);}
 evaluate(image:ImageBitmap,raw:TrackingRaw){return this.guard.evaluate(raw,validTrackingBox(raw.box,image.width,image.height)?this.signature(image,raw.box):null,image.width,image.height);}
}
