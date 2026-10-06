import {spawnSync} from 'node:child_process';
const env={...process.env,VITE_CONVEX_URL:'https://precious-fish-294.convex.cloud',VITE_TRIAL_VIDEO_PATH:'/videos/iron-e05a44b0.mp4'};
for(const [command,args]of [['npx',['convex','dev','--once']],['npm',['run','build']],['npx',['--yes','wrangler@4.147.0','pages','deploy','dist','--project-name','naive-physics','--branch','main']]]){
 console.log(`\n> ${command} ${args.join(' ')}`);
 const result=spawnSync(command,args,{stdio:'inherit',env,shell:process.platform==='win32'});
 if(result.error){console.error(result.error.message);process.exit(1);}if(result.status!==0)process.exit(result.status??1);
}
console.log('\nCheddar Vox deployed: Cloudflare website updated; Convex public pages redirect to https://cheddarvox.com.');
