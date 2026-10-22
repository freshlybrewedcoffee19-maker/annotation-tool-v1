export type ProductWorkflow = 'annotation' | 'marketing';
export type ProductEventName = 'recording_attempt' | 'save_succeeded' | 'clip_play';
export type ProductTraffic = 'live' | 'local' | 'test';

export type ProductEventInput = {
 workflow: ProductWorkflow;
 name: ProductEventName;
 eventId?: string;
 sample?: boolean;
 workspaceToken?: string;
 episodeId?: string;
 segmentId?: string;
 imageLabelId?: string;
 cardId?: string;
 versionId?: string;
 feedbackId?: string;
 reviewToken?: string;
};

export type ProductEventPayload = ProductEventInput & {
 eventId: string;
 visitorId: string;
 sessionId: string;
 traffic: ProductTraffic;
};

type Sink = (payload: ProductEventPayload) => Promise<unknown>;
type Connection = {send: Sink; active: boolean; pending: number};

const VISITOR_KEY = 'cheddarvox:product-visitor:v1';
const SESSION_KEY = 'cheddarvox:product-session:v1';
const MAX_PENDING = 32;
const MAX_SEEN = 512;
const seen = new Set<string>();
let connection: Connection | undefined;
let visitorId: string | undefined;
let sessionId: string | undefined;
let sequence = 0;

function anonymousId(prefix: string): string {
 try {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid === 'string' && uuid) return `${prefix}_${uuid}`;
 } catch { /* Restricted browsers can deny crypto access. */ }
 // These identifiers are anonymous labels, never authentication credentials.
 sequence += 1;
 return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${sequence.toString(36)}`;
}

function persistentId(storageName: 'localStorage' | 'sessionStorage',key: string,prefix: string): string {
 let storage: Storage | undefined;
 try {
  storage = globalThis[storageName];
  const stored = storage?.getItem(key);
  if (stored && stored.length <= 128 && new RegExp(`^${prefix}_[a-zA-Z0-9_-]+$`).test(stored)) return stored;
 } catch { /* Fall back to a label kept only in memory. */ }
 const created = anonymousId(prefix);
 try { storage?.setItem(key,created); } catch { /* Storage is optional. */ }
 return created;
}

function identity() {
 visitorId ??= persistentId('localStorage',VISITOR_KEY,'pv');
 sessionId ??= persistentId('sessionStorage',SESSION_KEY,'ps');
 return {visitorId,sessionId};
}

function traffic(): ProductTraffic {
 try {
  if (import.meta.env?.MODE === 'test' || globalThis.navigator?.webdriver) return 'test';
  const query = new URLSearchParams(globalThis.location?.search ?? '');
  if (query.has('example') || query.has('preview')) return 'test';
  const hostname = globalThis.location?.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') return 'local';
  return hostname ? 'live' : 'local';
 } catch { return 'local'; }
}

/** Install once when creating the application's backend client. No events are buffered before installation. */
export function configureProductTracking(send: Sink): () => void {
 if (connection) connection.active = false;
 const current: Connection = {send,active:true,pending:0};
 connection = current;
 return () => {
  current.active = false;
  if (connection === current) connection = undefined;
 };
}

/** A saved record counts once. Shared sample records count once per visitor/session instead. */
export function productSaveEventId(workflow: ProductWorkflow,recordId: string,sample = false): string {
 const base = `${workflow}:save:${recordId}`;
 if (!sample) return base;
 try {
  const ids = identity();
  return `${base}:${ids.visitorId}:${ids.sessionId}`;
 } catch { return base; }
}

/** Best effort only: no awaiting, retries, storage queue, or errors in the recording/playback control flow. */
export function trackProductEvent(input: ProductEventInput): void {
 try {
  const current = connection;
  if (!current?.active || current.pending >= MAX_PENDING || !input) return;
  if (input.workflow !== 'annotation' && input.workflow !== 'marketing') return;
  if (input.name !== 'recording_attempt' && input.name !== 'save_succeeded' && input.name !== 'clip_play') return;

  const eventId = typeof input.eventId === 'string' && input.eventId.length > 0 && input.eventId.length <= 256
   ? input.eventId : anonymousId('pe');
  if (seen.has(eventId)) return;
  // Build an explicit allowlist: spreading input could send transcript text or other private fields.
  const payload: ProductEventPayload = {workflow:input.workflow,name:input.name,eventId,...identity(),traffic:traffic()};
  if (typeof input.sample === 'boolean') payload.sample = input.sample;
  for (const field of ['workspaceToken','episodeId','segmentId','imageLabelId','cardId','versionId','feedbackId','reviewToken'] as const) {
   const value = input[field];
   if (typeof value === 'string' && value.length > 0 && value.length <= 2048) payload[field] = value;
  }

  seen.add(eventId);
  if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value!);
  current.pending += 1;
  try {
   setTimeout(() => {
    if (!current.active) { current.pending -= 1; return; }
    try {
     // Both branches settle silently; pending requests also count toward the fixed memory limit.
     void Promise.resolve(current.send(payload)).then(
      () => { current.pending -= 1; },
      () => { current.pending -= 1; },
     );
    } catch { current.pending -= 1; }
   },0);
  } catch { current.pending -= 1; }
 } catch { /* Product tracking must never affect the user's action, including unexpected runtime inputs. */ }
}
