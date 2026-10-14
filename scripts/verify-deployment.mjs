const assets=html=>[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m=>m[1]).sort();
const routes=['/','/video-feedback','/video-feedback/sample'];
export async function verifyDeployment(buildHTML,{readLive=async route=>{const r=await fetch(new URL(route,'https://cheddarvox.com'),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Website returned '+r.status);return r.text();},wait=()=>new Promise(resolve=>setTimeout(resolve,5000)),attempts=6,log=console.log}={}){
 const expected=assets(buildHTML);if(!expected.length)throw Error('Built frontend has no versioned frontend asset.');
 let unverified=routes;
 for(let attempt=1;attempt<=attempts;attempt++){
  const results=await Promise.all(routes.map(async route=>{
   try{const actual=assets(await readLive(route));return actual.length===expected.length&&expected.every((asset,i)=>actual[i]===asset)?null:route;}
   catch{return route;}
  }));
  unverified=results.filter(route=>route!==null);
  if(!unverified.length){log('Verified cheddarvox.com '+routes.join(', ')+' serve the built frontend: '+expected.map(s=>s.split('/').at(-1)).join(', '));return;}
  if(attempt<attempts){log('Waiting for the new frontend on cheddarvox.com '+unverified.join(', ')+' ('+attempt+'/'+attempts+')…');await wait();}
 }
 throw Error('Deployment uploaded, but cheddarvox.com has not served the new frontend on '+unverified.join(', ')+' yet. Check the website before calling this release live.');
}
