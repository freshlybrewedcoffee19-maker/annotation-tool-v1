export const home='/video-feedback';
export function canonical(path:string){return path.replace(/^\/marketing(?=\/|$)/,home).replace(/^\/video-feedback\/board(?=\/|$)/,home+'/workspace').replace(/^\/video-feedback\/card\//,home+'/cards/');}
export function safeReturn(value:string|null){
 if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return home+'/workspace';
 try{const url=new URL(value,'https://return.invalid');if(url.origin!=='https://return.invalid')return home+'/workspace';const path=canonical(url.pathname);return /^\/video-feedback(?:\/workspace\/?|\/cards\/[^/]+\/?|\/review\/[a-f0-9]{64}\/?|\/invite\/[a-f0-9]{64}\/?)$/.test(path)?path+url.search:home+'/workspace';}catch{return home+'/workspace';}
}
export function allowLeave(){const event=new Event('marketing-before-leave',{cancelable:true});window.dispatchEvent(event);return !event.defaultPrevented;}
