import {test,expect} from 'vitest';
import {verifyDeployment} from '../scripts/verify-deployment.mjs';
test('deployment waits through stale frontend responses and fails instead of claiming an unverified release',async()=>{
 const current='<script type="module" src="/assets/index-current.js"></script>',old='<script src="/assets/index-old.js"></script>';let reads=0,waits=0;await verifyDeployment(current,{readLive:async()=>++reads===1?old:current,wait:async()=>{waits++;},log:()=>{},attempts:2});expect(reads).toBe(2);expect(waits).toBe(1);
 const withCSS=current+'<link href="/assets/current.css" rel="stylesheet">';let cssReads=0;await verifyDeployment(withCSS,{readLive:async()=>++cssReads===1?current+'<link href="/assets/old.css">':withCSS,wait:async()=>{},log:()=>{},attempts:2});expect(cssReads).toBe(2);
 await expect(verifyDeployment(current,{readLive:async()=>old,wait:async()=>{},log:()=>{},attempts:2})).rejects.toThrow('has not served');await expect(verifyDeployment(current,{readLive:async()=>{throw Error('Connection reset');},wait:async()=>{},log:()=>{},attempts:1})).rejects.toThrow('has not served');await expect(verifyDeployment('',{log:()=>{}})).rejects.toThrow('no versioned');
});
