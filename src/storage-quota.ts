export type StorageQuota={stored:number;reserved:number;storageLimit:number;available:number;owner:boolean};
export type StorageLimitDetails=StorageQuota&{requested:number};

export function storageLimitFromError(error:unknown,fallback?:StorageQuota,requested=0):StorageLimitDetails|null{
 const data=error&&typeof error==='object'&&'data' in error?(error as {data:unknown}).data:null;
 if(data&&typeof data==='object'&&'code' in data&&data.code==='STORAGE_LIMIT'){
  const value=data as Record<string,unknown>;
  const number=(key:string,otherwise:number)=>typeof value[key]==='number'&&Number.isFinite(value[key])?Math.max(0,value[key] as number):otherwise;
  return {stored:number('storedBytes',fallback?.stored??0),reserved:number('reservedBytes',fallback?.reserved??0),storageLimit:number('storageLimit',fallback?.storageLimit??1e9),available:number('availableBytes',fallback?.available??0),requested:number('requestedBytes',requested),owner:typeof value.owner==='boolean'?value.owner:fallback?.owner??true};
 }
 const message=typeof error==='string'?error:error instanceof Error?error.message:'';
 if(/(?:storage limit.*1 GB|1 GB.*storage limit|free plan storage limit)/i.test(message))return {...fallback??{stored:0,reserved:0,storageLimit:1e9,available:0,owner:true},requested};
 return null;
}
export function storageSize(bytes:number){return bytes>=1e9?`${(bytes/1e9).toFixed(2)} GB`:`${(Math.max(0,bytes)/1e6).toFixed(1)} MB`;}
