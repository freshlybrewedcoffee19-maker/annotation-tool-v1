import {afterEach,beforeEach,expect,test,vi} from 'vitest';

function memoryStorage() {
 const values = new Map<string,string>();
 return {
  values,
  getItem: vi.fn((key:string) => values.get(key) ?? null),
  setItem: vi.fn((key:string,value:string) => { values.set(key,value); }),
 };
}

let local: ReturnType<typeof memoryStorage>;
let session: ReturnType<typeof memoryStorage>;

beforeEach(() => {
 vi.resetModules();
 vi.useFakeTimers();
 vi.stubEnv('MODE','production');
 local = memoryStorage();
 session = memoryStorage();
 vi.stubGlobal('localStorage',local);
 vi.stubGlobal('sessionStorage',session);
 vi.stubGlobal('navigator',{webdriver:false});
 vi.stubGlobal('location',{hostname:'cheddarvox.com'});
});

afterEach(() => {
 vi.clearAllTimers();
 vi.useRealTimers();
 vi.unstubAllGlobals();
 vi.unstubAllEnvs();
});

const event = {workflow:'annotation',name:'recording_attempt'} as const;

test('tracking returns immediately and sends after the current gesture even if the request never settles',async () => {
 const tracking = await import('../src/product-tracking');
 const send = vi.fn(() => new Promise(() => {}));
 tracking.configureProductTracking(send);
 expect(tracking.trackProductEvent(event)).toBeUndefined();
 expect(send).not.toHaveBeenCalled();
 await vi.runAllTimersAsync();
 expect(send).toHaveBeenCalledOnce();
});

test('synchronous and rejected request failures never reach the caller and are not retried',async () => {
 const tracking = await import('../src/product-tracking');
 const send = vi.fn()
  .mockImplementationOnce(() => { throw new Error('offline'); })
  .mockRejectedValueOnce(new Error('offline'))
  .mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 expect(() => tracking.trackProductEvent({...event,eventId:'sync-failure'})).not.toThrow();
 expect(() => tracking.trackProductEvent({...event,eventId:'rejected-failure'})).not.toThrow();
 await vi.runAllTimersAsync();
 tracking.trackProductEvent({...event,eventId:'later-event'});
 tracking.trackProductEvent({...event,eventId:'sync-failure'});
 tracking.trackProductEvent({...event,eventId:'rejected-failure'});
 await vi.runAllTimersAsync();
 expect(send).toHaveBeenCalledTimes(3);
});

test('blocked storage and unavailable crypto use stable in-memory anonymous IDs',async () => {
 vi.stubGlobal('localStorage',{getItem:() => { throw new Error('blocked'); },setItem:() => { throw new Error('blocked'); }});
 vi.stubGlobal('sessionStorage',undefined);
 vi.stubGlobal('crypto',{randomUUID:() => { throw new Error('unavailable'); }});
 const tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 expect(() => tracking.trackProductEvent(event)).not.toThrow();
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 const [first,second] = send.mock.calls.map(([payload]) => payload);
 expect(first.visitorId).toEqual(expect.any(String));
 expect(first.sessionId).toEqual(expect.any(String));
 expect(second.visitorId).toBe(first.visitorId);
 expect(second.sessionId).toBe(first.sessionId);
 expect(second.eventId).not.toBe(first.eventId);
});

test('only anonymous IDs persist and IDs survive a reload without persisting the request',async () => {
 let tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 tracking.trackProductEvent({...event,workspaceToken:'secret-workspace',reviewToken:'secret-review'});
 await vi.runAllTimersAsync();
 vi.resetModules();
 tracking = await import('../src/product-tracking');
 tracking.configureProductTracking(send);
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 const [first,second] = send.mock.calls.map(([payload]) => payload);
 expect(second.visitorId).toBe(first.visitorId);
 expect(second.sessionId).toBe(first.sessionId);
 expect([...local.values.values()]).toEqual([first.visitorId]);
 expect([...session.values.values()]).toEqual([first.sessionId]);
 expect(JSON.stringify([...local.values,...session.values])).not.toContain('secret');
});

test('a new browser session preserves the visitor but gets a new session ID',async () => {
 let tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 vi.resetModules();
 vi.stubGlobal('sessionStorage',memoryStorage());
 tracking = await import('../src/product-tracking');
 tracking.configureProductTracking(send);
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 const [first,second] = send.mock.calls.map(([payload]) => payload);
 expect(second.visitorId).toBe(first.visitorId);
 expect(second.sessionId).not.toBe(first.sessionId);
});

test('save IDs deduplicate retries and sample saves are scoped to the visitor and session',async () => {
 let tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 const real = tracking.productSaveEventId('annotation','segment123');
 const sample = tracking.productSaveEventId('annotation','segment123',true);
 expect(real).toBe('annotation:save:segment123');
 expect(tracking.productSaveEventId('annotation','segment123',true)).toBe(sample);
 tracking.trackProductEvent({...event,name:'save_succeeded',eventId:real});
 tracking.trackProductEvent({...event,name:'save_succeeded',eventId:real});
 await vi.runAllTimersAsync();
 expect(send).toHaveBeenCalledOnce();
 vi.resetModules();
 vi.stubGlobal('sessionStorage',memoryStorage());
 tracking = await import('../src/product-tracking');
 expect(tracking.productSaveEventId('annotation','segment123')).toBe(real);
 expect(tracking.productSaveEventId('annotation','segment123',true)).not.toBe(sample);
});

test.each([
 ['production',false,'cheddarvox.com','live'],
 ['production',false,'localhost','local'],
 ['production',false,'127.0.0.1','local'],
 ['production',false,'[::1]','local'],
 ['production',true,'cheddarvox.com','test'],
 ['production',true,'localhost','test'],
 ['test',false,'cheddarvox.com','test'],
])('mode %s, automated %s, host %s is tagged %s',async (mode,webdriver,hostname,traffic) => {
 vi.stubEnv('MODE',mode);
 vi.stubGlobal('navigator',{webdriver});
 vi.stubGlobal('location',{hostname});
 const tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 expect(send.mock.calls[0][0].traffic).toBe(traffic);
});

test('the payload only contains approved fields and never copies private text or arbitrary extras',async () => {
 const tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 const input = {
  ...event,eventId:'allowed-event',sample:true,episodeId:'episode123',segmentId:'segment123',imageLabelId:'image123',
  cardId:'card123',versionId:'version123',feedbackId:'feedback123',
  workspaceToken:'transport-only-workspace',reviewToken:'transport-only-review',
  transcript:'private words',audio:'private audio',email:'private@example.com',
  fullURL:'https://example.com/?secret=private',userAgent:'private browser',accessToken:'private token',
  visitorId:'spoofed-visitor',sessionId:'spoofed-session',traffic:'live',
 };
 tracking.trackProductEvent(input);
 await vi.runAllTimersAsync();
 const payload = send.mock.calls[0][0];
 expect(Object.keys(payload).sort()).toEqual([
  'workflow','name','eventId','sample','episodeId','segmentId','imageLabelId','cardId','versionId','feedbackId',
  'workspaceToken','reviewToken','visitorId','sessionId','traffic',
 ].sort());
 expect(payload.visitorId).not.toBe('spoofed-visitor');
 expect(payload.sessionId).not.toBe('spoofed-session');
 expect(payload.workspaceToken).toBe('transport-only-workspace');
 expect(payload.reviewToken).toBe('transport-only-review');
 expect(JSON.stringify(payload)).not.toContain('private');
});

test.each(['?example','?preview=1'])('preview query %s is tagged as test without sending the URL',async (search) => {
 vi.stubGlobal('location',{hostname:'cheddarvox.com',search});
 const tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 expect(send.mock.calls[0][0].traffic).toBe('test');
 expect(send.mock.calls[0][0]).not.toHaveProperty('search');
});

test('the public sample page counts as live with an explicit sample marker',async () => {
 vi.stubGlobal('location',{hostname:'cheddarvox.com',pathname:'/sample',search:''});
 const tracking = await import('../src/product-tracking');
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 tracking.trackProductEvent({...event,sample:true});
 await vi.runAllTimersAsync();
 expect(send.mock.calls[0][0]).toMatchObject({traffic:'live',sample:true});
});

test('a missing sink or malformed runtime input never prevents the caller continuing',async () => {
 const tracking = await import('../src/product-tracking');
 expect(() => tracking.trackProductEvent(event)).not.toThrow();
 const send = vi.fn().mockResolvedValue(undefined);
 tracking.configureProductTracking(send);
 expect(() => tracking.trackProductEvent(null as never)).not.toThrow();
 expect(() => tracking.trackProductEvent({get workflow() { throw new Error('bad getter'); }} as never)).not.toThrow();
 tracking.trackProductEvent({...event,name:'transcript text'} as never);
 await vi.runAllTimersAsync();
 expect(send).not.toHaveBeenCalled();
});

test('a flood of unresolved requests has a bounded in-memory backlog',async () => {
 const tracking = await import('../src/product-tracking');
 const send = vi.fn(() => new Promise(() => {}));
 tracking.configureProductTracking(send);
 for (let index=0;index<1000;index++) tracking.trackProductEvent({...event,eventId:`flood-${index}`});
 await vi.runAllTimersAsync();
 expect(send.mock.calls.length).toBeGreaterThan(0);
 expect(send.mock.calls.length).toBeLessThanOrEqual(64);
 const dispatches = send.mock.calls.length;
 for (let index=0;index<1000;index++) tracking.trackProductEvent({...event,eventId:`later-flood-${index}`});
 await vi.runAllTimersAsync();
 expect(send).toHaveBeenCalledTimes(dispatches);
});

test('cleanup drops scheduled work and an old cleanup cannot disconnect a newer sink',async () => {
 const tracking = await import('../src/product-tracking');
 const first = vi.fn().mockResolvedValue(undefined);
 const second = vi.fn().mockResolvedValue(undefined);
 const removeFirst = tracking.configureProductTracking(first);
 tracking.trackProductEvent(event);
 const removeSecond = tracking.configureProductTracking(second);
 removeFirst();
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 expect(first).not.toHaveBeenCalled();
 expect(second).toHaveBeenCalledOnce();
 removeSecond();
 tracking.trackProductEvent(event);
 await vi.runAllTimersAsync();
 expect(second).toHaveBeenCalledOnce();
});
