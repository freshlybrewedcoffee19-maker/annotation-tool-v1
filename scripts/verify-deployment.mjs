const assets=html=>[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m=>m[1]).sort();
export async function verifyDeployment(buildHTML,{readLive=async()=>{const r=await fetch('https://cheddarvox.com/',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Website returned '+r.status);return r.text();},wait=()=>new Promise(resolve=>setTimeout(resolve,5000)),attempts=6,log=console.log}={}){
 const expected=assets(buildHTML);if(!expected.length)throw Error('Built frontend has no versioned frontend asset.');
 for(let attempt=1;attempt<=attempts;attempt++){try{const actual=assets(await readLive());if(actual.length===expected.length&&expected.every((asset,i)=>actual[i]===asset)){log('Verified cheddarvox.com serves the built frontend: '+expected.map(s=>s.split('/').at(-1)).join(', '));return;}}catch{}if(attempt<attempts){log('Waiting for the new frontend on cheddarvox.com ('+attempt+'/'+attempts+')…');await wait();}}
 throw Error('Deployment uploaded, but cheddarvox.com has not served the new frontend yet. Check the website before calling this release live.');
}
