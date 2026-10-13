// Configures only the isolated local deployment. No values are logged.
import {execFileSync} from 'node:child_process';
import {generateKeyPair,exportPKCS8,exportJWK} from 'jose';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),cli=path.join(root,'node_modules/convex/bin/main.js');
const run=args=>{try{return execFileSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000}).trim();}catch{throw Error(`Preview configuration command failed (${args[0]} ${args[1]}). Values withheld.`);}};
for(const name of ['R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET']){const value=run(['env','get',name,'--deployment','precious-fish-294']);if(!value)throw Error(`Missing ${name}`);run(['env','set',name,value,'--deployment','local']);}
const {privateKey,publicKey}=await generateKeyPair('RS256',{extractable:true});
run(['env','set','JWT_PRIVATE_KEY','--deployment','local','--',await exportPKCS8(privateKey)]);
run(['env','set','JWKS',JSON.stringify({keys:[{...await exportJWK(publicKey),use:'sig'}]}),'--deployment','local']);
run(['env','set','SITE_URL','http://127.0.0.1:5175','--deployment','local']);
await fs.mkdir(path.join(root,'.np-tools-private'),{recursive:true});
console.log('Isolated local preview configured with private storage and its own sign-in keys. Live backend unchanged.');
