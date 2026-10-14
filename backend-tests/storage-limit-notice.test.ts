import {describe,it,expect} from 'vitest';
import {ConvexError} from 'convex/values';
import {storageLimitFromError} from '../src/storage-quota';

describe('account storage limit notice',()=>{
 it('keeps owner and reservation details from a rejected upload',()=>{
  const result=storageLimitFromError(new ConvexError({code:'STORAGE_LIMIT',storageLimit:1e9,storedBytes:800e6,reservedBytes:100e6,requestedBytes:150e6,availableBytes:100e6,owner:false}));
  expect(result).toEqual({stored:800e6,reserved:100e6,storageLimit:1e9,available:100e6,requested:150e6,owner:false});
 });
 it('recognises the annotation uploader’s readable limit error',()=>{
  expect(storageLimitFromError('Free plan storage limit reached (1 GB).', {stored:1e9,reserved:0,storageLimit:1e9,available:0,owner:true})?.stored).toBe(1e9);
 });
 it('does not present a payment notice for network failures or per-file limits',()=>{
  expect(storageLimitFromError(new Error('Upload failed.'))).toBeNull();
  expect(storageLimitFromError(new Error('Free plan: each video can be up to 250 MB.'))).toBeNull();
 });
});
