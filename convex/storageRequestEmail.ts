// No client-provided destination, subject or sender is accepted.
export const storageRequestRecipient='riya.shah@cheddarvox.com';
export type StorageRequestEmailPayload={requestId:string;userId:string;name:string;email:string;source:'marketing'|'annotation';storedBytes:number;reservedBytes:number;storageLimit:number;requestedBytes:number;rateUsdPerGbMonth:number;createdAt:number};
export type StorageRequestDelivery={ok:true;providerId:string}|{ok:false;failureCode:'configuration'|'rejected'|'temporary'|'unknown'};

export function storageRequestEmail(payload:StorageRequestEmailPayload){
 const oneLine=(text:string)=>text.replace(/[\r\n]/g,' ').slice(0,254);
 return {
  from:'Cheddar Vox <riya.shah@cheddarvox.com>',to:[storageRequestRecipient],reply_to:payload.email,
  subject:'Extra storage request — Cheddar Vox',
  text:[
   'A signed-in Cheddar Vox account requested extra storage.',
   '',`Name: ${oneLine(payload.name)||'Not provided'}`,`Email: ${oneLine(payload.email)}`,`Account ID: ${payload.userId}`,
   `Workflow: ${payload.source==='marketing'?'Video feedback':'Data annotation'}`,
   `Stored: ${payload.storedBytes} bytes (${(payload.storedBytes/1e9).toFixed(3)} GB)`,
   `Pending uploads: ${payload.reservedBytes} bytes (${(payload.reservedBytes/1e9).toFixed(3)} GB)`,
   `Free allowance: ${payload.storageLimit} bytes (${(payload.storageLimit/1e9).toFixed(0)} GB)`,
   `Requested upload size: ${payload.requestedBytes} bytes`,
   `Rate shown: $${payload.rateUsdPerGbMonth.toFixed(3)} per additional GB-month`,
   '',`Request ID: ${payload.requestId}`,`Requested at: ${new Date(payload.createdAt).toISOString()}`,
   '', 'These details come from the signed-in account. This request does not activate paid storage or charge the account.',
  ].join('\n'),
 };
}

export async function sendStorageRequestEmail(payload:StorageRequestEmailPayload,key=process.env.RESEND_API_KEY):Promise<StorageRequestDelivery>{
 if(!key)return {ok:false,failureCode:'configuration'};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15_000);
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`storage-request/${payload.requestId}`},body:JSON.stringify(storageRequestEmail(payload))});
  if(!response.ok)return {ok:false,failureCode:response.status===429||response.status>=500?'temporary':'rejected'};
  const result:unknown=await response.json();
  if(!result||typeof result!=='object'||!('id' in result)||typeof result.id!=='string'||!result.id||result.id.length>200)return {ok:false,failureCode:'temporary'};
  return {ok:true,providerId:result.id};
 }catch{return {ok:false,failureCode:'temporary'};}finally{clearTimeout(timeout);}
}
