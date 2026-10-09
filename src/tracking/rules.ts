export type TrackingBox=[number,number,number,number];
export type TrackingFrame={time:number;decodedTime?:number;x:number;y:number;width:number;height:number;uncertain:boolean};
export type TrackingRaw={box:TrackingBox|null;displayBox?:TrackingBox|null;score:number;ambiguous:boolean};
export function validTrackingBox(box:TrackingBox|null,width:number,height:number):box is TrackingBox{return !!box&&box.length===4&&box.every(Number.isFinite)&&box[0]>=0&&box[1]>=0&&box[2]>0&&box[3]>0&&box[0]+box[2]<=width&&box[1]+box[3]<=height;}
export function trackingTimes(start:number,end:number){if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>10.000001)throw Error('Choose up to ten seconds after the starting frame.');const steps=Math.min(50,Math.ceil((end-start)*5));return Array.from({length:steps+1},(_,i)=>start+(end-start)*i/steps);}
export function maskBounds(pixels:Uint8Array,width:number,height:number):TrackingBox{let left=width,top=height,right=-1,bottom=-1;for(let i=0;i<pixels.length;i++)if(pixels[i]){const x=i%width,y=Math.floor(i/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}if(right<0)throw Error('Choose a nonempty confirmed mask.');return [left/width,top/height,(right-left+1)/width,(bottom-top+1)/height];}
export class TrackingGuard{
 reference:Float32Array|null=null;last:TrackingBox|null=null;reason:string|null='Confirm a starting outline.';
 confirm(box:TrackingBox,signature:Float32Array,width:number,height:number,confirmed:boolean){if(!confirmed||!validTrackingBox(box,width,height))throw Error('Confirm an outline inside the frame before starting.');this.reference=signature.slice();this.last=[...box];this.reason=null;}
 evaluate(raw:TrackingRaw,signature:Float32Array|null,width:number,height:number){
 if(this.reason)return this.reason;const b=raw.box,last=this.last!;let reason:string|null=null;
 if(!validTrackingBox(b,width,height))reason='The outline left the frame.';
 else if(!Number.isFinite(raw.score)||raw.score<.8)reason='The tracking response dropped.';
 else if(raw.ambiguous)reason='More than one similar object is plausible.';
 else{const ratio=b[2]*b[3]/(last[2]*last[3]),distance=Math.hypot(b[0]+b[2]/2-last[0]-last[2]/2,b[1]+b[3]/2-last[1]-last[3]/2);let colour=0,chroma=0;
 if(!signature||signature.length!==88)reason='The object pixels could not be checked.';
 else{for(let i=0;i<88;i++){const overlap=Math.sqrt(signature[i]*this.reference![i]);if(i<24)colour+=overlap;else chroma+=overlap;}if(ratio<.5||ratio>2||distance>Math.max(last[2],last[3])*.5)reason='The outline changed abruptly.';else if((colour/3+chroma)/2<.85)reason='The appearance no longer matches the starting frame.';}}
 if(reason)this.reason=reason;else this.last=[...b!];return reason;
 }
}
