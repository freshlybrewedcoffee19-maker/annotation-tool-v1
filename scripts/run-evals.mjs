import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
let eventsPath,asOf;
for(let index=2;index<process.argv.length;index++){
 const argument=process.argv[index];
 if(argument==='--events'&&process.argv[index+1])eventsPath=resolve(process.cwd(),process.argv[++index]);
 else if(argument==='--as-of'&&process.argv[index+1])asOf=process.argv[++index];
 else {console.error('Usage: npm run evals [-- --events path/to/product-events.json --as-of ISO_TIMESTAMP]');process.exit(2);}
}
if(asOf&&!eventsPath){console.error('--as-of requires --events.');process.exit(2);}
if(eventsPath){try{JSON.parse(readFileSync(eventsPath,'utf8'));}catch{console.error('The events input must be a readable JSON export.');process.exit(2);}}

const suites=[
 ['voice-evals','Fixed transcript and timestamp examples'],
 ['marketing-voice-session','Listening and recognition restart rules'],
 ['marketing-voice-lifecycle','Completed notes and interrupted drafts'],
 ['marketing-continuous-voice','Continuous commands and feedback separation'],
 ['marketing-feedback-autosave','Settling and automatic saving'],
 ['marketing-feedback-queue','Failed saves and retry isolation'],
 ['marketing-playback-activation','Playback activation from the mic tap'],
 ['marketing-voice-platform','Phone text-only branch selection'],
 ['marketing-microphone','Audio permission and interrupted capture recovery'],
 ['marketing','Real feedback save functions and review access in memory'],
 ['workspace-groups','Real annotation saves and account attribution in memory'],
 ['product-tracking-voice','Voice and image saves during tracking failures'],
 ['product-tracking-clips','Real clip component playback observation'],
 ['product-events','Event access, classification and duplicate protection'],
 ['product-tracking','Tracking isolation and privacy allowlist'],
 ['images','Untimed image-label persistence and commands'],
 ['product-evals','Honest product-metric grouping and denominators'],
];
const startedAt=new Date().toISOString();
const output=join(root,'.np-tools-private','evals',startedAt.replace(/[:.]/g,'-'));
mkdirSync(output,{recursive:true});
const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
const status=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'});
const fingerprints={};
for(const file of ['evals/voice-cases.json','src/marketing/voice-commands.ts','src/marketing/voice-session.ts','src/marketing/feedback-autosave.ts','src/marketing/FeedbackComposer.tsx','src/marketing/feedback-queue.ts','src/marketing/pcm.ts','src/voice-segments.ts','convex/marketing.ts','convex/annotations.ts','scripts/evaluate-product-events.mjs','scripts/run-evals.mjs',...suites.map(([name])=>`backend-tests/${name}.test.ts`)]){
 fingerprints[file]=createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
}
const report={
 schemaVersion:1,startedAt,finishedAt:null,gitCommit:git.status===0?git.stdout.trim():null,
 trackedChangesPresent:status.status!==0||!!status.stdout.trim(),sourceSha256:fingerprints,
 automaticStatus:'running',suites:[],totals:{passed:0,failed:0,skipped:0},
 physicalPhoneSpeech:{status:'needs_measurement',reason:'These checks supply speech results and run browser checks in Chrome. They do not measure a physical Android/iPhone microphone or speech service.'},
 userValue:{status:'needs_measurement',reason:'Task correctness, paired time savings, editor understanding and next eligible job require the EVALS.md pilot.'},
 productActivity:{status:'not_provided',reason:'No events export supplied. No live data was read.'},
};
console.log('Running isolated Cheddar Vox evaluations. No server, live writes or deployment.');
console.log(`Reports: ${output}`);
for(const [name,purpose] of suites){
 const jsonPath=join(output,`${name}.json`);
 const run=spawnSync(process.execPath,[join(root,'node_modules','vitest','vitest.mjs'),'run',`backend-tests/${name}.test.ts`,'--reporter=json',`--outputFile=${jsonPath}`],{
  cwd:root,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024,env:{...process.env,NO_COLOR:'1'},
 });
 const logPath=join(output,`${name}.log`);
 writeFileSync(logPath,(run.stdout??'')+(run.stderr??'')+(run.error?`\n${run.error.message}\n`:''));
 let result;try{result=JSON.parse(readFileSync(jsonPath,'utf8'));}catch{/* A setup failure is a failure, never a skipped pass. */}
 const pass=run.status===0&&result?.success===true&&result?.numPassedTests>0;
 const entry={name,purpose,status:pass?'passed':'failed',passed:result?.numPassedTests??0,failed:result?.numFailedTests??0,skipped:(result?.numPendingTests??0)+(result?.numTodoTests??0),log:relative(root,logPath)};
 // A required skipped check must not turn the overall gate green.
 if(entry.skipped>0)entry.status='failed';
 report.suites.push(entry);report.totals.passed+=entry.passed;report.totals.failed+=entry.failed;report.totals.skipped+=entry.skipped;
 console.log(`${entry.status.toUpperCase()}: ${purpose} (${entry.passed} passed, ${entry.failed} failed, ${entry.skipped} skipped)`);
}
let activityFailed=false;
if(eventsPath){
 const run=spawnSync(process.execPath,[join(root,'scripts','evaluate-product-events.mjs'),eventsPath,...(asOf?['--as-of',asOf]:[])],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 writeFileSync(join(output,'product-activity.log'),(run.stdout??'')+(run.stderr??'')+(run.error?`\n${run.error.message}\n`:''));
 try{
  if(run.status!==0)throw Error('Scorer did not complete.');
  report.productActivity=JSON.parse(run.stdout);
 }catch{activityFailed=true;report.productActivity={status:'failed',reason:'Could not evaluate the supplied export; see product-activity.log.'};}
}
report.automaticStatus=report.suites.every(suite=>suite.status==='passed')&&!activityFailed?'passed':'failed';
report.finishedAt=new Date().toISOString();
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const lines=[
 '# Cheddar Vox evaluation run','',`Run: ${startedAt}`,`Source commit: ${report.gitCommit??'unavailable'}`,
 `Tracked changes present: ${report.trackedChangesPresent}. Source fingerprints are recorded in report.json.`,'',
 `Automated checks: **${report.automaticStatus.toUpperCase()}** — ${report.totals.passed} passed, ${report.totals.failed} failed, ${report.totals.skipped} skipped.`,
 'A suite setup failure is also a failed gate, even if it produced zero assertions.','',
 '| Check | Result | Passed | Failed | Skipped |','|---|---|---:|---:|---:|',
 ...report.suites.map(suite=>`| ${suite.purpose} | ${suite.status} | ${suite.passed} | ${suite.failed} | ${suite.skipped} |`),'',
 '**Real-phone speech quality: NEEDS MEASUREMENT.** Simulated speech is not microphone or accent accuracy.',
 '**User value: NEEDS MEASUREMENT.** No paired time-saving or real editor-understanding result has been assumed.','',
 eventsPath?'An offline activity export was scored; see report.json. An event is not proof of a correct note or a satisfied user.':'No activity export supplied; no live user counts were fetched.',
 'The proposed pilot and definitions are in EVALS.md. Test and local traffic must remain excluded from customer reports.','',
];
writeFileSync(join(output,'report.md'),lines.join('\n'));
console.log(`\nAutomated gate: ${report.automaticStatus.toUpperCase()}. Real-phone quality and user value: NEEDS MEASUREMENT.`);
console.log(`Report: ${join(output,'report.md')}`);
if(report.automaticStatus!=='passed')process.exitCode=1;
