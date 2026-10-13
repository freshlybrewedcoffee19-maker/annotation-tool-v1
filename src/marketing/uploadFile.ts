/** Local previews use Vite's development-only relay; published uploads stay direct. */
export function uploadFile(url:string,body:Blob,mime:string){
 if(url.startsWith('sample-upload:'))return Promise.resolve(new Response(null,{status:200}));
 const local=import.meta.env.DEV&&import.meta.env.VITE_CONVEX_URL==='http://127.0.0.1:3210';
 return fetch(local?`/__marketing-preview-upload?url=${encodeURIComponent(url)}`:url,{method:'PUT',body,headers:{'Content-Type':mime}});
}
