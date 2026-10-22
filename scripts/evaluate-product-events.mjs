import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const FIVE_MINUTES=300_000;
const workflows=['annotation','marketing'];
const names=['recording_attempt','save_succeeded','clip_play'];
const roles=['owner','editor','reviewer','public_reviewer','anonymous'];
const references=['actorId','workspaceId','episodeId','segmentId','imageLabelId','cardId','versionId','feedbackId'];
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2048;
const tuple=(...parts)=>JSON.stringify(parts);
const iso=time=>time===undefined||time===null?null:new Date(time).toISOString();

function valid(row){
 if(!row||typeof row!=='object'||Array.isArray(row))return false;
 if(!['eventId','visitorId','sessionId'].every(key=>text(row[key])))return false;
 if(!workflows.includes(row.workflow)||!names.includes(row.name)||!roles.includes(row.actorRole))return false;
 if(!['live','local','test'].includes(row.traffic)||!['voice','manual','unknown'].includes(row.source)||typeof row.sample!=='boolean')return false;
 if(!Number.isFinite(row.createdAt)||row.createdAt<0||row.createdAt>8.64e15)return false;
 if(references.some(key=>row[key]!==undefined&&!text(row[key])))return false;
 if(row.workflow==='annotation'){
  if(!row.episodeId||row.cardId||row.versionId||row.feedbackId)return false;
  if(row.segmentId&&row.imageLabelId)return false;
  return row.name==='recording_attempt'||!!(row.segmentId||row.imageLabelId);
 }
 if(row.episodeId||row.segmentId||row.imageLabelId)return false;
 if(row.sample)return !row.cardId&&!row.versionId&&!row.feedbackId;
 return !!(row.cardId&&row.versionId&&(row.name==='recording_attempt'||row.feedbackId));
}

function mediaContext(row){
 // Marketing's in-memory sample deliberately carries no private record IDs.
 if(row.workflow==='marketing'&&row.sample)return 'sample';
 return row.workflow==='annotation'?tuple('episode',row.episodeId):tuple('version',row.cardId,row.versionId);
}
function sessionKey(row){return tuple(row.visitorId,row.sessionId,row.workflow,row.sample,mediaContext(row));}
function recordKey(row){
 if(row.segmentId)return tuple('segment',row.segmentId);
 if(row.imageLabelId)return tuple('imageLabel',row.imageLabelId);
 if(row.feedbackId)return tuple('feedback',row.feedbackId);
 return null;
}
function median(values){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}

function summarize(rows,workflow,sample,asOf){
 const selected=rows.filter(row=>row.workflow===workflow&&row.sample===sample);
 const attempts=selected.filter(row=>row.name==='recording_attempt');
 const saves=selected.filter(row=>row.name==='save_succeeded');
 const sessions=new Map();
 for(const attempt of attempts){const key=sessionKey(attempt);if(!sessions.has(key))sessions.set(key,{attempt,firstSave:undefined});}
 let savesWithoutMatchingAttempt=0;
 for(const save of saves){
  const entry=sessions.get(sessionKey(save));
  if(!entry||save.createdAt<entry.attempt.createdAt){savesWithoutMatchingAttempt++;continue;}
  entry.firstSave??=save;
 }
 let settledSessions=0,completedWithinFiveMinutes=0,pendingSessions=0,pendingSessionsAlreadyCompleted=0;
 const elapsed=[];
 for(const {attempt,firstSave} of sessions.values()){
  const completed=firstSave!==undefined&&firstSave.createdAt-attempt.createdAt<=FIVE_MINUTES;
  if(firstSave)elapsed.push((firstSave.createdAt-attempt.createdAt)/1000);
  if(asOf-attempt.createdAt<FIVE_MINUTES){pendingSessions++;if(completed)pendingSessionsAlreadyCompleted++;}
  else{settledSessions++;if(completed)completedWithinFiveMinutes++;}
 }
 const clipPlays={invitedEditor:0,publicReviewer:0,ownerExcluded:0,otherRoleExcluded:0};
 for(const row of selected.filter(row=>row.name==='clip_play')){
  if(workflow==='marketing'&&row.actorRole==='editor')clipPlays.invitedEditor++;
  else if(workflow==='marketing'&&row.actorRole==='public_reviewer')clipPlays.publicReviewer++;
  else if(row.actorRole==='owner')clipPlays.ownerExcluded++;
  else clipPlays.otherRoleExcluded++;
 }
 const saveSources={voice:0,manual:0,unknown:0};
 for(const row of saves)saveSources[row.source]++;
 return {
  workflow,sample,events:selected.length,recordingAttempts:attempts.length,
  microphoneSessions:sessions.size,
  observedSessionCompletion:{
   status:settledSessions?'measured':'insufficient_evidence',windowSeconds:FIVE_MINUTES/1000,
   settledSessions,completedWithinFiveMinutes,pendingSessions,pendingSessionsAlreadyCompleted,
   rate:settledSessions?completedWithinFiveMinutes/settledSessions:null,
  },
  confirmedSaves:saves.length,saveSources,savesWithoutMatchingAttempt,
  pairedSessionsWithConfirmedSave:elapsed.length,
  timeToFirstConfirmedSaveMedianSeconds:median(elapsed),clipPlays,
 };
}

/** Pure offline scorer. Raw identities remain in memory; only aggregate values are returned. */
export function evaluateProductEvents(input,{asOf}={}){
 if(!Array.isArray(input))throw new Error('Expected a JSON array exported from productEvents.');
 if(asOf!==undefined&&(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(asOf)||!Number.isFinite(Date.parse(asOf))))throw new Error('Use a valid ISO timestamp with a timezone for --as-of.');
 const counts={input:input.length,malformed:0,test:0,local:0,future:0,duplicateEvents:0,duplicateSavedRecords:0,analyzed:0};
 const accepted=[],validInput=[];
 for(const row of input){
  if(!valid(row)){counts.malformed++;continue;}
  validInput.push(row.createdAt);
  if(row.traffic!=='live'){counts[row.traffic]++;continue;}
  accepted.push(row);
 }
 validInput.sort((a,b)=>a-b);
 // A frozen export must not gain additional observation time merely by being scored later.
 const cutoffSource=asOf===undefined?'latest_input_event':'explicit';
 const cutoff=asOf===undefined?(validInput.at(-1)??null):Date.parse(asOf);
 accepted.sort((a,b)=>a.createdAt-b.createdAt);
 const events=new Set(),records=new Set(),rows=[];
 for(const row of accepted){
  if(row.createdAt>cutoff){counts.future++;continue;}
  const event=tuple(row.visitorId,row.eventId);
  if(events.has(event)){counts.duplicateEvents++;continue;}
  events.add(event);
  const record=row.name==='save_succeeded'?recordKey(row):null;
  if(record&&records.has(record)){counts.duplicateSavedRecords++;continue;}
  if(record)records.add(record);
  rows.push(row);
 }
 counts.analyzed=rows.length;
 const accounts=new Set(),anonymous=new Set(),signedBrowsers=new Set(),tabs=new Set();
 for(const row of rows){
  tabs.add(tuple(row.visitorId,row.sessionId));
  if(row.actorId){accounts.add(row.actorId);signedBrowsers.add(row.visitorId);}
  else anonymous.add(row.visitorId);
 }
 return {
  schemaVersion:1,status:rows.length?'observed_events':'insufficient_evidence',asOf:iso(cutoff),cutoffSource,
  coverage:{inputEarliestEventAt:iso(validInput[0]),inputLatestEventAt:iso(validInput.at(-1)),liveEarliestEventAt:iso(rows[0]?.createdAt),liveLatestEventAt:iso(rows.at(-1)?.createdAt)},
  rows:counts,
  audience:{identifiedAccounts:accounts.size,anonymousBrowserIds:anonymous.size,browserIdsSeenBothAnonymousAndSignedIn:[...anonymous].filter(id=>signedBrowsers.has(id)).length,distinctBrowserTabSessions:tabs.size},
  groups:workflows.flatMap(workflow=>[true,false].map(sample=>summarize(rows,workflow,sample,cutoff))),
  definitions:{
   microphoneSession:'First deliberate mic-on in one browser/tab session, workflow, sample status and media context. Later mic-on attempts in that context do not reset the clock.',
   observedSessionCompletion:'First confirmed save within five minutes of that first mic-on, using the same context. Rate uses only sessions whose full five-minute window has elapsed as of the cutoff.',
   timeToFirstConfirmedSave:'Median seconds from first mic-on to first later matching confirmed save; includes paired saves after five minutes and paired pending sessions. Uses server receipt times.',
   inputCoverage:'Earliest and latest valid input event times, including excluded traffic. This does not prove the export is complete.',
   cutoff:'Explicit --as-of when supplied; otherwise the latest valid input event time, never the current clock. Empty exports have no inferred cutoff. This is observed coverage, not guaranteed complete coverage.',
  },
  limitations:[
   'These are observed live-tagged events, not verified humans. Unmarked manual tests may remain.',
   'This is not a failed-save rate or a voice-only success rate. One mic session can save several notes; saves can be manual or have unknown source.',
   'Tracking is best effort. Missing attempts or saves can mean missing tracking, not failed voice capture. Verify persisted records separately.',
   'Do not add identified accounts and anonymous browser IDs into a unique-people total. One person may use multiple browsers, and anonymous activity may later belong to an identified account.',
   'No historical user count, retention, completed editing or time saved is inferred. Clip playback shows a start, not completed viewing or editing.',
   'Pending windows are excluded from the completion rate. By default the last valid input event marks the observation cutoff. An elapsed window is still only as complete as the supplied export; use --as-of only at a known export cutoff.',
  ],
 };
}

async function main(args){
 if(args.length===1&&args[0]==='--help'){
  process.stdout.write('Usage: node scripts/evaluate-product-events.mjs <events.json> [--as-of <ISO timestamp>]\nReads a local productEvents JSON array and prints aggregate JSON. No network requests.\n');return;
 }
 if(!args[0]||args[0].startsWith('--')||![1,3].includes(args.length)||(args.length===3&&args[1]!=='--as-of'))throw new Error('Provide one JSON file and optionally --as-of with an ISO timestamp.');
 let input;
 try{input=JSON.parse(await readFile(args[0],'utf8'));}catch{throw new Error('Cannot read a valid JSON export from the supplied file.');}
 process.stdout.write(JSON.stringify(evaluateProductEvents(input,args.length===3?{asOf:args[2]}:{}),null,2)+'\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main(process.argv.slice(2)).catch(error=>{process.stderr.write(JSON.stringify({error:error.message})+'\n');process.exitCode=1;});
}
