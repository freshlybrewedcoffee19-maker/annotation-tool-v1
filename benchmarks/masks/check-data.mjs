import assert from 'node:assert/strict';import {encodeMask,decodeMask} from './mask-data.mjs';
for(const pixels of [new Uint8Array(12),new Uint8Array(12).fill(1),Uint8Array.from([0,1,0,1,0,1,1,1,0,0,0,1])])assert.deepEqual(decodeMask(encodeMask(pixels,4,3)),pixels);
assert.throws(()=>decodeMask({encoding:'binary-rle-row-major',width:4,height:3,counts:[13]}));assert.throws(()=>decodeMask({encoding:'binary-rle-row-major',width:4,height:3,counts:[5]}));assert.throws(()=>encodeMask([1],4,3));console.log('Mask reconstruction and invalid-input checks passed');
