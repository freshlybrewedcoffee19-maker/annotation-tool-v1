import {afterEach, expect, test, vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api, internal} from '../convex/_generated/api';

const modules = import.meta.glob('../convex/**/*.{ts,js}');
const send = vi.hoisted(() => vi.fn());
vi.mock('../convex/r2Client', () => ({r2Client: () => ({client: {send}, bucket: 'test-only'})}));
afterEach(() => {vi.useRealTimers(); send.mockReset();});

async function fixture() {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert('users', {email: 'cleanup@example.invalid'}));
  const owner = t.withIdentity({subject: `${userId}|test`});
  const stagingKey = 'marketing/staging/upload-cleanup-test';
  const uploadId = await owner.mutation(internal.marketing.reserve, {
    kind: 'video', title: 'Campaign', name: 'cut.mp4', size: 100,
    mime: 'video/mp4', duration: 10, width: 1280, height: 720, key: stagingKey,
  });
  const finalKey = `marketing/video/${userId}/${uploadId}`;
  send.mockImplementation(async command => command.constructor.name === 'HeadObjectCommand'
    ? {ContentLength: 100, ContentType: 'video/mp4', ETag: 'checked-etag'} : {});
  return {t, owner, uploadId, stagingKey, finalKey};
}

test('saved upload returns before temporary deletion while keeping HEAD and conditional copy protections', async () => {
  const f = await fixture();
  const result = await f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId});
  expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['HeadObjectCommand', 'CopyObjectCommand']);
  expect(send.mock.calls[1][0].input).toMatchObject({
    Key: f.finalKey, CopySource: `test-only/${f.stagingKey}`, CopySourceIfMatch: 'checked-etag',
  });
  expect(await f.t.run(ctx => ctx.db.get(result.versionId))).toMatchObject({key: f.finalKey});
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(send.mock.calls[2][0].input).toEqual({Bucket: 'test-only', Key: f.stagingKey});
  // The signed PUT may recreate staging until it expires; the later cleanup must still run.
  expect(await f.t.run(ctx => ctx.db.get(f.uploadId))).toMatchObject({completed: true});
  expect((await f.t.run(ctx => ctx.db.get(f.uploadId)))?.stagingCleanedAt).toBeUndefined();
  expect(await f.owner.query(api.marketing.storageQuota, {})).toMatchObject({stored: 100, reserved: 0});
});

test('temporary deletion failure retries without failing or deleting the saved video', async () => {
  const f = await fixture();
  let failures = 2;
  send.mockImplementation(async command => {
    if (command.constructor.name === 'HeadObjectCommand') return {ContentLength: 100, ContentType: 'video/mp4', ETag: 'checked-etag'};
    if (command.constructor.name === 'DeleteObjectCommand' && failures-- > 0) throw new Error('Temporary R2 failure');
    return {};
  });
  const result = await f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId});
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  const deletes = send.mock.calls.map(([command]) => command).filter(command => command.constructor.name === 'DeleteObjectCommand');
  expect(deletes).toHaveLength(3);
  expect(deletes.every(command => command.input.Key === f.stagingKey)).toBe(true);
  expect(await f.t.run(ctx => ctx.db.get(result.versionId))).toMatchObject({key: f.finalKey});
  expect((await f.t.run(ctx => ctx.db.get(f.uploadId)))?.stagingCleanedAt).toBeUndefined();
});

test('completion retry is idempotent and only retries cleanup of its recorded staging key', async () => {
  const f = await fixture();
  const first = await f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId});
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  send.mockClear();
  expect(await f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId})).toEqual(first);
  expect(send).not.toHaveBeenCalled();
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0][0].input).toEqual({Bucket: 'test-only', Key: f.stagingKey});
});

test('cleanup refuses pending uploads, final media paths and already expired staging cleanup', async () => {
  const f = await fixture();
  await f.t.action(internal.marketingFiles.cleanCompletedStaging, {uploadId: f.uploadId});
  expect(send).not.toHaveBeenCalled();
  await f.owner.mutation(internal.marketing.finishUpload, {uploadId: f.uploadId, key: f.finalKey});
  await f.t.run(ctx => ctx.db.patch(f.uploadId, {key: f.finalKey}));
  await f.t.action(internal.marketingFiles.cleanCompletedStaging, {uploadId: f.uploadId});
  expect(send).not.toHaveBeenCalled();
  await f.t.run(ctx => ctx.db.patch(f.uploadId, {key: f.stagingKey, finalKey: 'marketing/video/someone-else/saved'}));
  await f.t.action(internal.marketingFiles.cleanCompletedStaging, {uploadId: f.uploadId});
  expect(send).not.toHaveBeenCalled();
  await f.t.run(ctx => ctx.db.patch(f.uploadId, {finalKey: f.finalKey, stagingCleanedAt: Date.now()}));
  await f.t.action(internal.marketingFiles.cleanCompletedStaging, {uploadId: f.uploadId});
  expect(send).not.toHaveBeenCalled();
});

test('size validation failure leaves the pending upload untouched and schedules no deletion', async () => {
  const f = await fixture();
  send.mockResolvedValue({ContentLength: 50, ContentType: 'video/mp4', ETag: 'partial'});
  await expect(f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId})).rejects.toThrow('incomplete');
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(send).toHaveBeenCalledOnce();
  expect((await f.t.run(ctx => ctx.db.get(f.uploadId)))?.completed).toBe(false);
});

test('copy failure does not save the version or schedule deletion of the recoverable upload', async () => {
  const f = await fixture();
  send.mockImplementation(async command => {
    if (command.constructor.name === 'HeadObjectCommand') return {ContentLength: 100, ContentType: 'video/mp4', ETag: 'checked-etag'};
    throw new Error('Copy could not finish');
  });
  await expect(f.owner.action(api.marketingFiles.complete, {uploadId: f.uploadId})).rejects.toThrow('Copy could not finish');
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(['HeadObjectCommand', 'CopyObjectCommand']);
  expect((await f.t.run(ctx => ctx.db.get(f.uploadId)))?.completed).toBe(false);
});

test('exhausted cleanup retries stop and leave the expiry cleanup eligible', async () => {
  const f = await fixture();
  await f.owner.mutation(internal.marketing.finishUpload, {uploadId: f.uploadId, key: f.finalKey});
  send.mockRejectedValue(new Error('Storage still unavailable'));
  await expect(f.t.action(internal.marketingFiles.cleanCompletedStaging, {uploadId: f.uploadId, attempt: 3})).rejects.toThrow('Storage still unavailable');
  await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(send).toHaveBeenCalledOnce();
  expect((await f.t.run(ctx => ctx.db.get(f.uploadId)))?.stagingCleanedAt).toBeUndefined();
});
