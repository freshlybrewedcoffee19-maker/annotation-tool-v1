import {test,expect} from 'vitest';
import {validMaskPoints,validProposal} from '../src/mask-suggestions';
test('mask prompts need an inside point and remain bounded to the selected image',()=>{expect(validMaskPoints([{x:1,y:1,label:1},{x:0,y:0,label:0}],4,4)).toBe(true);for(const points of [[],[{x:0,y:0,label:0}],Array.from({length:21},()=>({x:1,y:1,label:1})),[{x:NaN,y:1,label:1}],[{x:4,y:1,label:1}]])expect(validMaskPoints(points as Parameters<typeof validMaskPoints>[0],4,4)).toBe(false);});
test('suggestions must be nonempty binary masks with the exact captured dimensions',()=>{expect(validProposal(Uint8Array.from([0,1,1,0]),2,2)).toBe(true);for(const p of [[0,0,0,0],[0,1],[0,2,1,0]])expect(validProposal(Uint8Array.from(p),2,2)).toBe(false);});
