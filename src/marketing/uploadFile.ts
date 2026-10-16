import {uploadWithProgress,type UploadProgress} from './upload-progress';
/** Local previews use Vite's development-only relay; published uploads stay direct. */
export function uploadFile(url:string,body:Blob,mime:string,progress?:(value:UploadProgress)=>void){
 if(url.startsWith('sample-upload:'))return Promise.resolve(new Response(null,{status:200}));
 const local=import.meta.env.DEV&&import.meta.env.VITE_CONVEX_URL==='http://127.0.0.1:3210';
 const target=local?`/__marketing-preview-upload?url=${encodeURIComponent(url)}`:url;
 return progress?uploadWithProgress(target,body,mime,progress):fetch(target,{method:'PUT',body,headers:{'Content-Type':mime}});
}
