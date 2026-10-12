// Each recognition session consumes each final result once. Interim text never saves.
export function imageSpeechResults(save:(label:string)=>void){
 const seen=new Set<number>();
 return {reset:()=>seen.clear(),result(index:number,text:string,final:boolean){if(!final||seen.has(index))return;seen.add(index);const label=text.trim().replace(/[.!?]+$/,'').trim();if(label)save(label);}};
}
