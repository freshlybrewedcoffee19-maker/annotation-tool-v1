export type MaskPoint={x:number;y:number;label:0|1};
export type MaskProposal={pixels:Uint8Array;score:number};
export type SuggestionRequest={id:number;width:number;height:number;image:Uint8ClampedArray;points:MaskPoint[]};
export type SuggestionResponse={id:number;type:'progress';message:string}|{id:number;type:'result';proposals:MaskProposal[];milliseconds:number}|{id:number;type:'error';message:string};
export function validMaskPoints(points:MaskPoint[],width:number,height:number){return points.length>0&&points.length<=20&&points.some(p=>p.label===1)&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<width&&p.y>=0&&p.y<height&&(p.label===0||p.label===1));}
export function validProposal(pixels:Uint8Array,width:number,height:number){return pixels.length===width*height&&pixels.some(p=>p===1)&&pixels.every(p=>p===0||p===1);}
