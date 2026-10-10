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
 const found=fs.readdirSync(path.join(root,location)).filter(f=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(f)&&fs.statSync(path.join(root,location,f)).isFile());
 const files=found.map(f=>({file:f,text:read(location+'/'+f)}));
 if(pkg.name.startsWith('onnxruntime-'))files.push({file:'Microsoft ONNX Runtime licence',text:read('scripts/license-evidence/onnxruntime-LICENSE.txt')});
 inventory.push({name:pkg.name,version:pkg.version,license:entry.license,location,noticeStatus:files.length?'Licence text collected; embedded components separately reviewed':'Upstream licence/copyright text unresolved'});
 notices.push('\n'+'='.repeat(72)+'\n'+pkg.name+' '+pkg.version+'\nDeclared licence: '+entry.license+'\n'+(files.length?files.map(f=>'\n--- '+f.file+' ---\n'+f.text).join('\n'):'No licence text included in this package; declaration recorded, attribution evidence still unresolved.')+'\n');
}
notices.push('\n'+'='.repeat(72)+'\nCVAT geometry helpers\n'+read('public/licenses/cvat-MIT.txt'));
notices.push('\n'+'='.repeat(72)+'\nSlimSAM model card at pinned revision\n'+read('scripts/license-evidence/slimsam-model-card.txt'));
notices.push('\n'+'='.repeat(72)+'\nNanoTrack V3\n'+read('scripts/NANOTRACK-LICENSE.txt')+'\nSource: 248663fde6bf7c40190cf10ee396d5662919ecd3/NanoTrack. Template input shape declarations modified; weights/operators unchanged.\n');
const target=path.join(root,'public/licenses');fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'third-party-notices.txt'),notices.join('\n'));
fs.writeFileSync(path.join(target,'onnxruntime-ThirdPartyNotices.txt'),read('scripts/license-evidence/onnxruntime-ThirdPartyNotices.txt'));
fs.writeFileSync(path.join(target,'dependency-notice-status.json'),JSON.stringify(inventory,null,2)+'\n');
console.log('Third-party licence texts prepared; '+inventory.filter(x=>x.noticeStatus.startsWith('Upstream')).length+' packages still require upstream attribution evidence.');
