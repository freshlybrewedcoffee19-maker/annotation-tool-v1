import {expect,test} from 'vitest';
import {evaluateProductEvents} from '../scripts/evaluate-product-events.mjs';

const start=Date.parse('2026-10-23T12:00:00Z');
const asOf=new Date(start+600_000).toISOString();
function event(extra:Record<string,unknown>={}){
 return {eventId:'event-1',visitorId:'browser-1',sessionId:'tab-1',workflow:'marketing',name:'recording_attempt',traffic:'live',createdAt:start,sample:false,actorRole:'owner',source:'voice',actorId:'account-1',cardId:'card-1',versionId:'version-1',...extra};
}
function save(extra:Record<string,unknown>={}){return event({eventId:'save-1',name:'save_succeeded',createdAt:start+20_000,feedbackId:'feedback-1',source:'unknown',...extra});}
const group=(report:any,workflow='marketing',sample=false)=>report.groups.find((row:any)=>row.workflow===workflow&&row.sample===sample);

test('pairs a confirmed save and labels the measure as observed session completion',()=>{
 const report=evaluateProductEvents([save(),event()],{asOf});const row=group(report);
 expect(row.microphoneSessions).toBe(1);
 expect(row.observedSessionCompletion).toMatchObject({status:'measured',settledSessions:1,completedWithinFiveMinutes:1,rate:1,pendingSessions:0});
 expect(row.timeToFirstConfirmedSaveMedianSeconds).toBe(20);
 expect(row.saveSources).toEqual({voice:0,manual:0,unknown:1});
 expect(report.limitations.join(' ')).toContain('not a failed-save rate');
});

test('excludes known test and local traffic, with no false zero-percent failure conclusion',()=>{
 const report=evaluateProductEvents([event({traffic:'test'}),save({traffic:'local'})],{asOf});
 expect(report.status).toBe('insufficient_evidence');
 expect(report.rows).toMatchObject({input:2,test:1,local:1,analyzed:0});
 expect(group(report).observedSessionCompletion.rate).toBeNull();
});

test('keeps sample, own media, and workflows separate',()=>{
 const sample={sample:true,cardId:undefined,versionId:undefined,actorId:undefined,actorRole:'anonymous'};
 const report=evaluateProductEvents([
  event({...sample,eventId:'sample-attempt'}),save({...sample,eventId:'sample-save',feedbackId:undefined}),
  event(),
  event({eventId:'annotation-attempt',workflow:'annotation',episodeId:'episode-1',cardId:undefined,versionId:undefined}),
  save({eventId:'annotation-save',workflow:'annotation',episodeId:'episode-1',segmentId:'segment-1',cardId:undefined,versionId:undefined,feedbackId:undefined,source:'voice'}),
 ],{asOf});
 expect(group(report,'marketing',true).observedSessionCompletion.rate).toBe(1);
 expect(group(report).observedSessionCompletion.rate).toBe(0);
 expect(group(report,'annotation').observedSessionCompletion.rate).toBe(1);
});

test.each([
 {visitorId:'another-browser'}, {sessionId:'another-tab'}, {versionId:'another-version'}, {cardId:'another-card'},
])('does not pair a save across browser, tab or media context: %j',(different)=>{
 const row=group(evaluateProductEvents([event(),save(different)],{asOf}));
 expect(row.observedSessionCompletion.completedWithinFiveMinutes).toBe(0);
 expect(row.savesWithoutMatchingAttempt).toBe(1);
 expect(row.timeToFirstConfirmedSaveMedianSeconds).toBeNull();
});

test('does not pair annotation saves with a different episode',()=>{
 const base={workflow:'annotation',cardId:undefined,versionId:undefined,feedbackId:undefined};
 const row=group(evaluateProductEvents([event({...base,episodeId:'episode-1'}),save({...base,episodeId:'episode-2',segmentId:'segment-2'})],{asOf}),'annotation');
 expect(row.savesWithoutMatchingAttempt).toBe(1);
});

test('uses the first deliberate mic attempt; repeated attempts cannot move the five-minute window',()=>{
 const row=group(evaluateProductEvents([event(),event({eventId:'restart',createdAt:start+280_000}),save({createdAt:start+310_000})],{asOf}));
 expect(row.recordingAttempts).toBe(2);expect(row.microphoneSessions).toBe(1);
 expect(row.observedSessionCompletion.rate).toBe(0);
 expect(row.timeToFirstConfirmedSaveMedianSeconds).toBe(310);
});

test('separates pending windows, including completed observations, from settled denominators',()=>{
 const report=evaluateProductEvents([event(),save()],{asOf:new Date(start+60_000).toISOString()});const row=group(report);
 expect(row.observedSessionCompletion).toMatchObject({status:'insufficient_evidence',settledSessions:0,pendingSessions:1,pendingSessionsAlreadyCompleted:1,rate:null});
});

test('save before the first attempt is unpaired; future events are not scored',()=>{
 const report=evaluateProductEvents([save({createdAt:start-1}),event(),save({eventId:'future-save',feedbackId:'future-feedback',createdAt:start+700_000})],{asOf});
 expect(report.rows.future).toBe(1);expect(group(report).savesWithoutMatchingAttempt).toBe(1);
 expect(group(report).observedSessionCompletion.rate).toBe(0);
 expect(report.coverage.inputLatestEventAt).toBe(new Date(start+700_000).toISOString());
});

test('counts invited-editor and public-reviewer playback separately, excluding owner plays',()=>{
 const plays=['owner','editor','public_reviewer','reviewer','anonymous'].map((actorRole,i)=>save({eventId:'play-'+i,name:'clip_play',actorRole}));
 const row=group(evaluateProductEvents(plays,{asOf}));
 expect(row.clipPlays).toEqual({invitedEditor:1,publicReviewer:1,ownerExcluded:1,otherRoleExcluded:2});
 expect(row.observedSessionCompletion.rate).toBeNull();
});

test('deduplicates repeated event IDs and persisted record IDs without double counting',()=>{
 const first=save();const report=evaluateProductEvents([event(),event(),first,{...first,eventId:'retry',visitorId:'second-browser'}],{asOf});
 expect(report.rows.duplicateEvents).toBe(1);expect(report.rows.duplicateSavedRecords).toBe(1);
 expect(group(report).confirmedSaves).toBe(1);
});

test('keeps identified accounts and anonymous browser IDs separate, including overlap caveat',()=>{
 const report=evaluateProductEvents([event({actorId:undefined,actorRole:'anonymous'}),save()],{asOf});
 expect(report.audience).toEqual({identifiedAccounts:1,anonymousBrowserIds:1,browserIdsSeenBothAnonymousAndSignedIn:1,distinctBrowserTabSessions:1});
 expect(report.limitations.join(' ')).toContain('Do not add');
 expect('uniquePeople' in report).toBe(false);
});

test('malformed rows are counted and rejected; arbitrary private fields never enter the report',()=>{
 const privateValue='SECRET-MUST-NOT-LEAK';
 const report=evaluateProductEvents([null,{},event({createdAt:'yesterday'}),event({sample:'false'}),event({traffic:'unknown'}),save({text:privateValue,email:privateValue,workspaceToken:privateValue})],{asOf});
 expect(report.rows.malformed).toBe(5);expect(report.rows.analyzed).toBe(1);
 expect(JSON.stringify(report)).not.toContain(privateValue);
 expect(JSON.stringify(report)).not.toContain('browser-1');
 expect(JSON.stringify(report)).not.toContain('account-1');
 expect(group(report).savesWithoutMatchingAttempt).toBe(1);
});

test('rejects non-array exports and invalid as-of values instead of guessing',()=>{
 expect(()=>evaluateProductEvents({events:[]},{asOf})).toThrow('JSON array');
 expect(()=>evaluateProductEvents([],{asOf:'invalid'})).toThrow('as-of');
});

test('empty exports explicitly report insufficient evidence and no measured rate',()=>{
 const report=evaluateProductEvents([],{asOf});
 expect(report.status).toBe('insufficient_evidence');
 expect(report.coverage.inputEarliestEventAt).toBeNull();
 expect(report.groups.every((row:any)=>row.observedSessionCompletion.rate===null)).toBe(true);
});

test('a frozen export defaults to its last event, so a recent attempt stays pending',()=>{
 const report=evaluateProductEvents([event(),save()]);
 expect(report.cutoffSource).toBe('latest_input_event');
 expect(report.asOf).toBe(new Date(start+20_000).toISOString());
 expect(group(report).observedSessionCompletion).toMatchObject({settledSessions:0,pendingSessions:1,rate:null});
 const explicit=evaluateProductEvents([event(),save()],{asOf});
 expect(explicit.cutoffSource).toBe('explicit');
 expect(group(explicit).observedSessionCompletion).toMatchObject({settledSessions:1,pendingSessions:0,rate:1});
});

test('an empty export without an explicit cutoff remains insufficient with a null cutoff',()=>{
 const report=evaluateProductEvents([]);
 expect(report).toMatchObject({status:'insufficient_evidence',asOf:null,cutoffSource:'latest_input_event'});
 expect(report.groups.every((row:any)=>row.observedSessionCompletion.rate===null)).toBe(true);
});
