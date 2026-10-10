import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const lock=JSON.parse(read('package-lock.json'));
const evidence=JSON.parse(read('scripts/license-evidence/sources.json'));
for(const item of evidence){const data=fs.readFileSync(path.join(root,'scripts/license-evidence',item.file));if(createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('Licence evidence checksum mismatch: '+item.file);}
const notices=['Cheddar Vox — third-party notices\n\nThis collection includes installed production dependencies, some used only by the build or Node tooling. Listing a library does not mean its binaries are distributed in the browser. Each component keeps its own licence; this file does not license Cheddar Vox or customer data.\n'];
const inventory=[];
for(const [location,entry] of Object.entries(lock.packages)){
 if(!location||entry.dev||!fs.existsSync(path.join(root,location)))continue;
 const pkg=JSON.parse(read(location+'/package.json'));
 if(pkg.version!==entry.version)throw Error('Installed dependency differs from lockfile: '+pkg.name);
 const found=fs.readdirSync(path.join(root,location)).filter(f=>/(^|[-_])(licen[sc]e|copying|notice)(s?\.|s?$)/i.test(f)&&fs.statSync(path.join(root,location,f)).isFile());
 const files=found.map(f=>({file:f,text:read(location+'/'+f)}));
 let mainLicenceCollected=files.length>0;
 let standardLicenceCopyProvided=false;
 if(!mainLicenceCollected&&entry.license==='Apache-2.0'){files.push({file:'Standard Apache-2.0 licence (package declares Apache-2.0; original notices retained separately)',text:read('scripts/license-evidence/Apache-2.0.txt')});standardLicenceCopyProvided=true;}
 if(pkg.name.startsWith('onnxruntime-')){files.push({file:'Microsoft ONNX Runtime licence',text:read('scripts/license-evidence/onnxruntime-LICENSE.txt')});mainLicenceCollected=true;}
 const parentName=pkg.name.startsWith('@esbuild/')?'esbuild':pkg.name.startsWith('@rolldown/binding-')?'rolldown':null;
 if(parentName){const parent=JSON.parse(read('node_modules/'+parentName+'/package.json'));if(parent.version!==pkg.version)throw Error('Binding/parent licence version mismatch: '+pkg.name);for(const f of fs.readdirSync(path.join(root,'node_modules',parentName)).filter(f=>/(^|[-_])(licen[sc]e|notice)(s?\.|s?$)/i.test(f))){files.push({file:parentName+' '+parent.version+'/'+f,text:read('node_modules/'+parentName+'/'+f)});}mainLicenceCollected=files.length>0;}
 if(pkg.name==='@convex-dev/auth')for(const f of ['src/server/provider_utils.ts','src/nextjs/server/routeMatcher.ts']){const header=read(location+'/'+f).split(/\r?\n/).filter((line,i,lines)=>i<lines.findIndex(l=>l.startsWith('import '))).join('\n').trim();if(!header.includes('Copyright'))throw Error('Embedded attribution header missing: '+f);files.push({file:'Embedded attribution retained from '+f,text:header});}
 if(pkg.name==='@convex-dev/auth')files.push({file:'src/server/oauth/NOTICE.txt (exact published source revision)',text:read('scripts/license-evidence/convex-auth-oauth-NOTICE.txt')});
 inventory.push({name:pkg.name,version:pkg.version,license:entry.license,location,noticeStatus:mainLicenceCollected?'Licence text collected; embedded-component review may remain open':standardLicenceCopyProvided?'Standard declared licence copy provided; original attribution/source mapping not fully verified':'Upstream main licence/copyright text unresolved',standardLicenceCopyProvided,collectedNoticeFiles:files.map(f=>f.file)});
 notices.push('\n'+'='.repeat(72)+'\n'+pkg.name+' '+pkg.version+'\nDeclared licence: '+entry.license+'\n'+(files.length?files.map(f=>'\n--- '+f.file+' ---\n'+f.text).join('\n'):'No licence text included in this package; declaration recorded, attribution evidence still unresolved.')+'\n');
}
notices.push('\n'+'='.repeat(72)+'\nCVAT geometry helpers\n'+read('public/licenses/cvat-MIT.txt'));
notices.push('\n'+'='.repeat(72)+'\nSlimSAM model card at pinned revision\n'+read('scripts/license-evidence/slimsam-model-card.txt'));
notices.push('\n'+'='.repeat(72)+'\nNanoTrack V3\n'+read('scripts/NANOTRACK-LICENSE.txt')+'\nSource: 248663fde6bf7c40190cf10ee396d5662919ecd3/NanoTrack. Template input shape declarations modified; weights/operators unchanged.\n');
const target=path.join(root,'public/licenses');fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'third-party-notices.txt'),notices.join('\n'));
fs.writeFileSync(path.join(target,'onnxruntime-ThirdPartyNotices.txt'),read('scripts/license-evidence/onnxruntime-ThirdPartyNotices.txt'));
fs.writeFileSync(path.join(target,'dependency-notice-status.json'),JSON.stringify(inventory,null,2)+'\n');
console.log('Third-party licence texts prepared; '+inventory.filter(x=>x.noticeStatus.startsWith('Upstream')).length+' packages lack original licence/copyright text; '+inventory.filter(x=>x.standardLicenceCopyProvided).length+' use a standard declared licence copy with attribution/source mapping limits recorded.');
