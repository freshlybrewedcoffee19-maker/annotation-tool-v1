import {test,expect} from 'vitest';
import {verifyDeployment} from '../scripts/verify-deployment.mjs';
const current='<script type="module" src="/assets/index-current.js"></script><link href="/assets/current.css" rel="stylesheet">';
const old='<script type="module" src="/assets/index-old.js"></script><link href="/assets/old.css" rel="stylesheet">';

test('deployment waits until the marketing sample also serves the new frontend',async()=>{
 const seen=new Set<string>();let sampleReads=0,waits=0;
 await verifyDeployment(current,{readLive:async(path='/')=>{seen.add(path);return path==='/video-feedback/sample'&&++sampleReads===1?old:current;},wait:async()=>{waits++;},log:()=>{},attempts:2});
 expect([...seen].sort()).toEqual(['/','/video-feedback','/video-feedback/sample']);
 expect(sampleReads).toBe(2);expect(waits).toBe(1);
});

test('a fresh homepage cannot hide an old marketing route or old stylesheet',async()=>{
 for(const stalePath of ['/video-feedback','/video-feedback/sample']){
  await expect(verifyDeployment(current,{readLive:async(path='/')=>path===stalePath?old:current,wait:async()=>{},log:()=>{},attempts:2})).rejects.toThrow(stalePath);
 }
 await expect(verifyDeployment(current,{readLive:async(path='/')=>path==='/video-feedback/sample'?current.replace('/assets/current.css','/assets/old.css'):current,wait:async()=>{},log:()=>{},attempts:1})).rejects.toThrow('/video-feedback/sample');
});

test('an unreachable route or missing build assets cannot be reported as verified',async()=>{
 await expect(verifyDeployment(current,{readLive:async(path='/')=>{if(path==='/video-feedback/sample')throw Error('Connection reset');return current;},wait:async()=>{},log:()=>{},attempts:1})).rejects.toThrow('/video-feedback/sample');
 await expect(verifyDeployment('',{log:()=>{}})).rejects.toThrow('no versioned');
});
