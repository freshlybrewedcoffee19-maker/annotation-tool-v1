# Cheddar Vox evaluations

Created 23 October 2026. Scope: the current data-annotation and video-feedback workflows. This pack changes no speech, saving, sign-in, database or hosting behavior.

## What we are testing

**Product promise:** people can speak instead of writing timestamps, keep the correct label or feedback attached to the correct moment, and give the next person something usable.

Three independent scorecards are required. A passing code check does not prove a real microphone understood someone, and neither proves people find the product useful.

| Scorecard | Evidence | Current way to collect it |
|---|---|---|
| Application reliability | Correct command interpretation, captured times, note retention, saving and clip selection | Run the isolated evaluation command below. Speech results are simulated; real application code is exercised. |
| Real-phone speech quality | Intended speech versus what actually happened on Android Chrome and iPhone Safari | Follow the phone protocol below. Currently unmeasured by this pack. |
| User value | A usable result, less timestamp-writing effort, successful editor handoff and use on the next relevant job | Observe a small pilot and use production activity as supporting evidence. Currently unvalidated hypotheses. |

Do not combine these into one percentage. Lost notes, invented commands or wrong clips must remain visible even if an average score looks good.

## GrowthX basis

These sources were retrieved through the GrowthX MCP on 23 October 2026. MCP is the connection that lets Codex search the member library. It returned module and chapter names but no lesson URLs; no links or source IDs have been invented.

| GrowthX module and chapter | Applied to Cheddar Vox |
|---|---|
| **Aha moments & activation — Building Activation Hypotheses** | State a candidate action and a time window, rather than calling every signup activated. |
| **Aha moments & activation — Validating Activation for Early-Stage Products** | Ask whether the action shows commitment, enables meaningful value and leads to the next useful action. Treat this as a hypothesis until observed. |
| **Aha moments & activation — Step 2: Observe User Behavior to Validate Interviews** | Compare what people say with a concrete task and its saved result. Do not treat a polite positive comment as proof. |
| **Full live class recording — Natural Frequency: Same Product, Different Usage Cadences** | Judge return use when someone has another annotation or video-review job. A quiet day is not automatically churn. |
| **How FDEs drive 0→1 AI transformations — Q&A: Post-Deployment Evaluation Metrics** | Combine usage measures with specific questions about failures and outcomes. |

All time windows, trial sizes and pass criteria below are **our starting hypotheses**, not GrowthX benchmarks or claims about existing performance.

## User-value pilot

Start with five annotators and five marketer/editor pairs who have a real relevant task. This is a small problem-finding pilot, not a statistically representative study. Report results as people or tasks out of the number observed. Keep sample users separate from people using their own footage.

| ID | Hypothesis to test | Success evidence | What current tracking can establish |
|---|---|---|---|
| VALUE-1 | A first-time user saves one usable timed label or feedback note within five minutes of deliberately enabling the mic. | Observer checks the intended words, start/end and resulting saved item; no rescue from the moderator. | A matching session has a confirmed save within five minutes. It does not prove voice origin, correctness or lack of assistance. |
| VALUE-2 | A user makes three usable notes in one session without writing timestamps or clicking Save. | Three intended moments and texts match the saved items. Record every correction and manual save. | Saves can be counted, but the new events do not record manual correction, utterance boundaries or Save clicks. |
| VALUE-3 | An editor finds the intended moment from each of three feedback clips within 30 seconds of being asked to review that note. | Editor identifies the exact requested change without asking the author for a timestamp. | A clip actually started. Signed-in editor and public-reviewer plays are distinguished; owner playback is not an editor handoff. |
| VALUE-4 | The voice workflow reduces time spent preparing usable notes by at least 25% versus that participant's normal method, without reducing correctness. | Paired timing of comparable tasks, including fixes and handoff/export work; independently check both outputs. | Not measurable from the current events. Mic-to-save time is not time saved versus another tool. |
| VALUE-5 | A satisfied participant chooses Cheddar Vox for their next eligible job. | Ask what the next job was, when it occurred, what tool they actually used and why. Review within 14 days; if no relevant job occurred, mark pending rather than failed. | Activity on another day is supporting evidence only, not proof of task eligibility or retention. |

For VALUE-1 and VALUE-2, score data annotation and marketing separately. For untimed image labels, check the correct image and label; do not apply video timestamp criteria.

### One pilot session

1. Explain the task, not the interface. Ask permission before recording a test screen or voice. Use participant-chosen, non-sensitive footage; no customer files belong in this repository.
2. Prepare two equally difficult clips, each with three comparable moments to label or review. Half the participants start with their usual workflow, half with Cheddar Vox; swap the clip assignment. This reduces practice effects.
3. Start timing when the participant is ready to perform the task in each tool. Stop when all three notes are usable and ready for the recipient. Include corrections, failed attempts and exports in the time.
4. For Cheddar Vox, separately time the first deliberate mic-on to the first usable saved note. Note whether the user understood what was happening while speaking.
5. Give the editor the feedback through the existing review link. Observe which clip they choose and whether they understand the requested change. Do not send any invitations without the owner's explicit instruction.
6. Check both tools' outputs against the same expected moments/text. Report each participant's time, correctness and assistance before any median. Exclude neither slow users nor failed attempts; mark reasons for any incomplete task.
7. Ask: “Which moment was difficult?”, “Did you have to write a timestamp anywhere?”, “What would you use for your next video?”, and later “What did you actually use?” Avoid leading questions such as “How much did this save you?”

Calculate paired time reduction as `100 × (usual_method_seconds - cheddar_seconds) / usual_method_seconds`, only when both tasks completed and baseline time is positive. Report incomplete tasks alongside results, not as zero time. Adoption is not established by meeting one five-minute task alone.

Use `evals/manual-session.template.json` for observations. Leave unknown values null and unfinished checks `not_run`; never fill them with assumed passes. Keep completed participant records in the ignored `.np-tools-private/` folder. Use participant codes, not names, emails or raw audio.

## Voice reliability and release gates

### Automated evidence

`evals/voice-cases.json` provides fixed, expected examples for the actual marketing command engine and annotation engine. The runner also reuses existing isolated checks for interruption, saving, retries, playback and tracking. Cases cover supported commands, phrases containing command words, partial/final results, repeated results, recognizer restarts and captured video times.

For this deterministic input set, every required case must pass. A note queued twice, silently lost after a completed phrase, attached to a wrong range, or interpreted as a command contrary to the expected case is a failed gate. Do not edit expectations merely to make current code pass. Keep a failed case and investigate it separately.

The report distinguishes engine outputs from actual saving: engine cases do not prove database persistence. Existing browser save tests use controlled speech/media and isolated save boundaries or the real in-memory sample store. Separate `marketing` and `workspace-groups` tests call the actual backend save functions against an isolated in-memory database, checking duplicate protection, video references, access and annotation ownership. They do not write to the live database. Android/iPhone user-agent strings in Chrome exercise the application branch; they do not run the Safari recognition service.

Android pause regressions added 23 October 2026: multi-sentence feedback with three-second thinking gaps, an eight-second gap after “uhm”, filler-only drafts, continuing after recognition restarts, and bounded retries for rapid empty recognition sessions. Android video feedback now waits six quiet seconds (twelve after a trailing thinking sound); saying “start” queues a meaningful note immediately. These are initial comfort settings to verify with people, not a guarantee for pauses of any length. Desktop, iPhone and data-annotation timing are unchanged. A real phone must still confirm whether native beeps or browser-driven microphone interruptions remain.

### Physical-phone protocol — still required

Use actual Android Chrome and iPhone Safari, record browser/OS versions and headset type, and keep only one tool tab's microphone enabled. Run both workflows with the same short, non-sensitive test clip. Test untimed image labels separately.

| Test | What to do | Required observation |
|---|---|---|
| PHONE-1 | Start, stop, speak a complete note; repeat ten times per device/workflow. | Every intended note is saved once with usable text and the right moment. Record all misses and corrections. |
| PHONE-2 | Finish a note, then immediately turn off the mic, switch apps or lock the screen; three trials for each interruption. | Each completed eligible note is queued once; verify its eventual saved state on reconnect. Unfinished speech remains an interrupted draft rather than silently becoming a final note. |
| PHONE-3 | Restart recognition during a note, finish speaking, then remain quiet. | The note settles and saves without requiring another spoken word. Check for lost prefixes and duplicates. |
| PHONE-4 | Say “start with the logo” and other feedback sentences containing command words. | Words remain feedback; playback does not change unexpectedly. |
| PHONE-5 | Put a second voice or source-video audio nearby while giving feedback. | Record unintended commands, unwanted text and saves. Browser recognition does not promise speaker identification; this is an explicit risk to measure, not an assumed capability. |
| PHONE-6 | Interrupt the network during saving, then restore it and use existing recovery controls. | Pending/failed state is truthful; retry does not duplicate or overwrite another note. |
| PHONE-7 | Open a saved feedback clip as the editor, then switch revisions and replay another clip. | Playback matches the feedback's own version and time range; permissions still hold. |

Measure **command response delay** from the audible command's onset to the visible playback response, and **timestamp error** against a known reference moment. These are different measures. Use a consented local screen/audio recording or an observer's reference clock; document measurement uncertainty. Suggested investigation thresholds are 0.5 seconds for boundary error and 1 second for command response, not measured guarantees. Report individual trials and the median; do not advertise a stable 95th percentile from ten trials.

Report note completion as usable confirmed notes divided by deliberately attempted notes recorded by the observer. Report false commands, lost notes and duplicate saves as separate counts. **Never divide saved events by mic-on events and call that voice accuracy:** one mic session can contain many notes, including manually entered ones.

## Reading the deployed tracking honestly

`productEvents` starts at the tracking deployment; it cannot explain earlier unrecorded sessions. For evaluation, use `traffic = live`; exclude `test` and `local`. Keep marketing/data annotation and sample/own-media groups separate. Known tests are marked, but unidentified manual testing can still require an exclusion list outside this scorer.

The offline scorer takes an existing JSON export; it never contacts Convex or changes data. It pairs a save with a mic attempt only inside the same browser/tab, workflow, sample status and media context. It reports pending observation windows separately. A save with no observed attempt is unmatched evidence, not a failure. A context with no observed save is also not proof of data loss, because tracking is best effort.

Five-minute session completion is a limited activation proxy. Event receipt times include network delay. A truncated export can omit attempts or saves. Report the export coverage, numerator/denominator and pending/unmatched counts with the result. The scorer reports account IDs and anonymous browsers separately, never a combined verified-people total; shared devices, cleared storage and later sign-in complicate identity. Retained-account counts require a separate current account inventory.

Editor and public-reviewer clip plays are separate from owner plays. Playing a clip does not prove the editor understood it, finished watching, changed the video or saved time. A review link's recipient cannot be identified from anonymous playback alone.

## Running and interpreting the pack

From `C:\Users\Riya\build-sprint-app`:

```powershell
npm run evals
```

Optional, using a JSON export that you already have locally:

```powershell
npm run evals -- --events .np-tools-private/product-events.json
```

Without a supplied cutoff, the scorer conservatively stops observation at the latest valid event in that export. If you know the export's actual coverage end, pass it explicitly, for example `--as-of 2026-10-23T12:10:00Z`. Do not use today's time for an older snapshot: doing so would wrongly treat recently started sessions in that snapshot as fully observed.

The command runs selected tests in separate processes to avoid the existing Windows test-runner temporary-file conflict. It starts no web/dev server, creates no live account or upload, changes no database records and does not deploy. Reports and raw output go to a timestamped directory under `.np-tools-private/evals/`.

An automated PASS means only that those listed checks passed. Real-phone speech and user-value hypotheses remain **needs measurement** until their separate evidence exists. Empty live-event input means **insufficient evidence**, not 0% success or failure. If any selected test fails or cannot run, the command exits unsuccessfully and keeps its raw output.

Next decision: use the first small pilot to discover the largest obstacle, then revise the proposed activation hypothesis or improve that specific obstacle. Do not redesign onboarding or claim proven time savings from test-event counts.
