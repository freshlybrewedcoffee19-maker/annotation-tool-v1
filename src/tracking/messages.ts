import type {TrackingBox,TrackingFrame} from './rules';
export type TrackingStart={type:'start';id:number;times:number[];box:TrackingBox;width:number;height:number};
export type TrackingInput=TrackingStart|{type:'image';id:number;index:number;image:ImageBitmap;decodedTime:number};
export type TrackingOutput={type:'frame';id:number;index:number}|{type:'progress';id:number;message:string}|{type:'result';id:number;frames:TrackingFrame[];stoppedAt?:number;stopReason?:string;milliseconds:number}|{type:'error';id:number;message:string};
