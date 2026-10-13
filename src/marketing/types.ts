export type Status='needs_feedback'|'changes_requested'|'revised'|'approved';
export const columns:{id:Status;name:string;empty:string}[]=[{id:'needs_feedback',name:'Needs feedback',empty:'Upload a video to get feedback.'},{id:'changes_requested',name:'Changes requested',empty:'Videos needing an update.'},{id:'revised',name:'Revised',empty:'New cuts ready for review.'},{id:'approved',name:'Approved',empty:'Approved videos stay here.'}];
export const boardColumns=columns;
export function workflowStage(status:Status){return status;}
export type Version={id:string;number:number;name:string;size:number;duration:number;width:number;height:number;uploadedAt:number;uploader:string;deleted:boolean};
export type Feedback={id:string;versionId:string;start:number;end:number;text:string;audioId:string|null;author:string;createdAt:number;reviewed:boolean;canEdit?:boolean;clientKey?:string};
export type CardData={card:{id:string;title:string;status:Status;latestVersionId:string|null;approvedVersionId:string|null;finalised:boolean;cleaning:boolean;cleanupError?:string|null};owner:boolean;versions:Version[];feedback:Feedback[];replies:{id:string;feedbackId:string;text:string;author:string;createdAt:number}[];events:{id:string;text:string;versionId?:string|null;type?:string|null;author:string;createdAt:number}[];access:{id:string;name:string;email:string;status:string;token?:string}[];links:{id:string;token:string;revoked:boolean}[]};
export function secret(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function sizeLabel(size:number){return size<1e6?`${(size/1000).toFixed(1)} KB`:`${(size/1e6).toFixed(1)} MB`;}
export function dateLabel(time:number){return new Date(time).toLocaleString('en',{dateStyle:'medium',timeStyle:'short'});}
export function message(error:unknown){return error instanceof Error?error.message.replace(/^.*?Uncaught Error: /s,'').split('\n')[0]:'Something went wrong. Your draft is retained; try again.';}
