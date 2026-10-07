# nAIve Physics build and deployment plan

Updated 4 October 2026. This plan covers every layer in the supplied comparison table. Build and publish the video layers in stages; keep 3D and supplying human labellers deferred as agreed. Existing voice annotation, private workspaces and exports must keep working.

The central decision is fixed: model processing runs inside the user's laptop browser. No rented graphics-processing computer, remote model API or desktop installation. Convex remains the database, backend, file storage, sign-in provider when needed, and website host. GitHub stores code. This is a plan, not evidence that a model has been installed or tested.

## Shared technology

| Part | Choice | Purpose |
|---|---|---|
| Interface | Existing React, TypeScript and Vite | Video controls, drawing, corrections and review |
| Drawing | Canvas and SVG browser APIs | Editable boxes, polygons and mask overlays aligned with the video |
| Model runner | ONNX Runtime Web | Run downloaded model files in the browser |
| Laptop acceleration | WebGPU where supported; WebAssembly where compatible | Use the laptop graphics processor, or a browser CPU execution path |
| Background processing | Web Workers | Process models without freezing the controls |
| Model download cache | Browser Cache Storage or IndexedDB | Reuse versioned model downloads; handle cache eviction |
| Saved data | Existing Convex functions, schema and file storage | Object identities, annotations, masks, decisions and progress |
| Multi-person review, later | Convex Auth and role checks | Identify reviewers and protect project access |
| Checks | Existing Playwright browser tests plus a small model benchmark | Verify actual flows and measure tracking errors |
| Releases | GitHub push followed by npm run deploy | Save code, then publish through Convex static hosting |

[ONNX Runtime Web documentation](https://onnxruntime.ai/docs/tutorials/web/) describes browser CPU and graphics execution. Runtime support alone does not guarantee that a particular model's operations, conversion or memory needs will work. Test each actual exported model on each supported execution path.

Current voice commands use Chrome speech recognition. Local vision processing does not make that existing speech service offline or necessarily local. The app also still uploads videos to Convex. Do not describe the whole product as offline or as keeping all footage on-device.

## Free model shortlist

These are candidates, not installed features. Inspect the exact downloadable weights, conversion provenance and notices before distribution; record versions and file hashes. Preserve required attribution. No paid model API is proposed.

| Job | First candidate | Alternative | Important limitation |
|---|---|---|---|
| Follow a user-selected box | NanoTrack V3 using ONNX Runtime Web; compare V2 if needed | Manual corrected boxes while the model is unavailable | Lightweight single-object tracking does not guarantee disappearance detection or correct identity after occlusion |
| Suggest object boxes | YOLOX Nano using ONNX Runtime Web | COCO-SSD lite_mobilenet_v2 using TensorFlow.js if the ONNX candidate fails browser checks | Standard pretrained category lists do not cover arbitrary user labels; an iron, hand or shirt must not be assumed supported |
| Suggest a precise object outline on one frame | MobileSAM with a fully browser-local encoder and decoder | Manual polygon drawing | A decoder-only demo with server-generated image features does not meet the local requirement; this is image segmentation, not a video tracker |
| Explore stronger video masks | SAM 2.1 Tiny, experimental comparison only | Small model only if laptop evidence justifies it | Full video state, conversion and memory are a larger integration task; native performance numbers are not browser benchmarks |
| Time segments, agreement checks, review decisions | No model required | Existing deterministic rules and human review | Do not claim automatic action understanding from a box detector |

Sources and rationale:

- [NanoTrack upstream](https://github.com/HonglinChu/SiamTrackers/tree/master/NanoTrack) supplies lightweight tracking variants and ONNX model information. Its V3 table reports approximately 1.4 MB for the backbone and 1.1 MB for the head; actual packaged downloads must be measured. Browser speed has not been tested here. [Repository licence](https://raw.githubusercontent.com/HonglinChu/SiamTrackers/master/NanoTrack/LICENSE) is Apache 2.0.
- [YOLOX upstream](https://github.com/Megvii-BaseDetection/YOLOX) provides detection models and ONNX deployment support. [Repository licence](https://raw.githubusercontent.com/Megvii-BaseDetection/YOLOX/main/LICENSE) is Apache 2.0. A converted file must preserve the upstream model's provenance.
- [COCO-SSD browser package](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) provides a browser detection path and identifies lite_mobilenet_v2 as its smallest base option. Use it only for supported categories; do not import two model runtimes unless the fallback earns its cost.
- [MobileSAM upstream](https://github.com/ChaoningZhang/MobileSAM) describes lightweight image segmentation and ONNX export. [Repository licence](https://raw.githubusercontent.com/ChaoningZhang/MobileSAM/master/LICENSE) is Apache 2.0. Inspect the export pipeline to ensure both image encoding and mask decoding are local.
- [Meta SAM 2 upstream](https://github.com/facebookresearch/sam2) supplies video segmentation, Tiny/Small variants and an Apache 2.0 project licence. Treat it as a comparison candidate rather than the first production dependency.

Free downloads do not mean zero total cost. The laptop supplies processing power, memory and battery; model downloads use bandwidth. Convex storage and hosting usage still apply. Do not rent computing or buy API access as a fallback.

## Repository layout

Keep one GitHub repository. Extend existing files rather than copying a separate annotation platform into it. The following folders are proposed boundaries, not files already created:

```text
src/annotation/       drawing tools, object list and video overlay
src/inference/        model loader, tracker/detector adapters and workers
src/review/           existing segment review plus spatial review
src/export/           adapters for object tracks, masks and time segments
convex/              ownership, saved annotations, review and model-job metadata
public/models/       approved compact model files, only after download tests
models/manifest.json versions, file hashes, licences and runtime requirements
benchmarks/          repeatable clips, expected results and measured reports
tests/               a few checks covering each important user path
```

Model files too large for ordinary Git should have reproducible preparation instructions and pinned download hashes; do not casually commit large checkpoints. Serve released assets through the existing Convex hosting/storage path. Conversion can use local development scripts, but production processing must remain in the browser and users must not need Python installed.

## Phase 0 browser feasibility and foundations

Do this before promising automated tracking. Dependencies: the existing app only.

1. Record the current working code checkpoint and preserve the original workspace data.
2. Define a provisional target: laptop Chrome/Edge, including an ordinary integrated-graphics laptop and a CPU execution path. Other browsers and phones are not initially promised for AI.
3. Assemble short clips covering motion, complete disappearance, partial occlusion, reappearance, two similar objects and a scene cut. Use the existing trial plus additional consented clips; do not treat one successful trial as general proof.
4. Add reference boxes and visible/absent/uncertain spans by hand. These are the expected answers against which models are compared.
5. Build a developer-only browser benchmark with no remote inference requests. First prove that saved Convex video pixels can be read safely: test cross-origin permissions, or fetch authorised footage into a local browser Blob without exposing workspace keys.
6. Run NanoTrack on a user-selected object. Measure first download, later cached start, time per processed frame, estimated memory, visible identity errors and interruption behaviour.
7. Try both compatible CPU and graphics execution paths. Keep decoding and processing bounded; do not load every full-resolution frame into memory.
8. Pin the chosen model files, notices and adapter version. Mark browser compatibility explicitly.
9. If the model fails, retain manual annotation and document the failure. Do not silently switch to cloud processing or call straight-line interpolation AI tracking.

Proposed initial gates, to validate rather than claim as achieved: the editor remains responsive; cancellation works immediately enough to be usable; a 10-second single-object test at five sampled frames per second finishes within 30 seconds on the agreed baseline laptop; clearly failed model loads have a usable manual fallback. Evaluate accuracy separately using reference boxes and disappearance events. A deliberately missed frame must not be silently presented as a measured model result.

Check: a repeatable benchmark report identifies hardware, browser, model, input size, processing rate and errors. Release: publish only a capability check/manual fallback if useful; keep unproven model experiments out of the main workflow. Then follow the shared release checklist.

## Phase 1 boxes and shapes on frames

Stack: React, Canvas/SVG and Convex. No model required. Dependency: frame identity and coordinate handling from Phase 0.

1. Add stable object records with user-defined names and separate identities, so two irons are distinct objects.
2. Save annotations against video time and frame index. Preserve timing information for videos whose frames are not evenly spaced; do not treat a manually entered frame rate as exact decoding evidence.
3. Add frame stepping and seeking with an overlay that fits the actual video content, including letterboxing and resizing.
4. Implement draw, move and resize for one box. Store coordinates relative to video dimensions, not screen pixels.
5. Add edit/cancel and undo for drawing changes, then keyboard-accessible controls.
6. Save and restore boxes through Convex with existing workspace ownership checks.
7. Add polygon drawing, vertex adjustment and completion/cancellation as the second small release of this layer.
8. Export object ID, name, frame/time, shape and coordinates without changing existing time-segment CSV columns.

Check: draw around an iron, resize the browser, step frames and reload; the box still belongs to the same object and frame. A second workspace cannot read or change it. Polygon edits and exports round-trip correctly. Release: ship boxes first, polygons next, each through the shared checklist.

The first-box prototype assumes the user draws and names the initial object. This was recommended but not explicitly confirmed before the discussion moved to the plan; confirm that interaction before building its final UI.

## Phase 2 tracking and interpolation

Stack: NanoTrack candidate, ONNX Runtime Web, Web Worker, Canvas and Convex. Dependency: Phase 1 and passing model feasibility.

1. Start a track from a confirmed object box; the tracker follows appearance while the user supplies the name.
2. Process a short time range first. Show progress, cancel and retry; tag saved results with the model version and processed frames.
3. Keep model suggestions separate from user corrections. A correction always wins for its frame.
4. Add manual visibility states: visible, absent and needs checking. Do not draw accepted boxes across absent/uncertain spans.
5. Combine tracker score, invalid geometry, abrupt motion and appearance checks to flag suspicious results. Scores are heuristics, not calibrated probabilities of correctness; a tracker can be confidently wrong.
6. When failure is detected, stop extending the accepted track and mark the span Needs checking. Keep raw proposals available for inspection rather than pretending the object is known absent.
7. Let the user find the reappearance, reconnect the same object, correct its box and resume. Do not automatically merge identities across lookalike objects or scene cuts.
8. Offer straight-line interpolation only as a clearly named draft between user-confirmed boxes in continuously visible spans. It does not establish object presence.
9. Save processed ranges and resume after refresh without overwriting confirmed work or launching duplicate jobs.

Check: test disappearance and two similar objects, not just smooth movement. Inspect false accepted boxes during absence, identity switches, box overlap with references and correction effort. Release only as assisted tracking with required human review; do not promise perfect automatic disappearance detection. Follow the shared checklist.

## Phase 3 review and quality checks

Stack: existing review cards, spatial overlays, Convex and deterministic comparison rules. No model required. Dependency: Phase 1; expand it after Phase 2.

1. Show the short clip with the tracked object overlay and its visibility states.
2. Add object/frame/range review alongside existing action-segment review.
3. Keep Verify, Disqualify, Edit and Undo. Editing accepted geometry returns that range to review.
4. Prioritise Needs checking spans and identity breaks. A bulk approval must not hide unresolved spans.
5. Record what was reviewed and which version was reviewed. Later model updates cannot silently change previously approved annotations.
6. Make new object-track and mask exports exclude disqualified/unresolved results by default; explicitly label any optional draft export. Preserve the existing documented behaviour that pending action segments are exportable.
7. When introducing an actual second reviewer, add Convex Auth, project memberships and roles before sharing data. Preserve existing personal browser workspaces; do not make them public.
8. Compare independently labelled frames using object matching and box/mask overlap; compare intervals using time overlap. Report disagreements before adjudication rather than claiming a universal accuracy score.

Check: refresh, undo, edit after verification, rejected export, cross-workspace access and two-reviewer disagreement. Agreement requires two independent annotations, not two clicks on the same suggestion. Release personal object review first; release multi-person review only after identity/access checks pass. Follow the shared checklist for each release.

## Phase 4 AI pre-labelling

Stack: YOLOX Nano candidate and existing ONNX runtime. COCO-SSD browser package is an optional benchmark alternative, not an automatic added dependency. Dependency: Phase 3's suggestion/review separation.

1. List the exact categories the chosen pretrained detector supports.
2. Match suggestions only to supported labels; allow a user to rename a suggestion without claiming the model recognised that new category.
3. For unsupported categories such as the user's particular iron or garment, retain manual selection plus tracking. Do not create an invented class mapping.
4. Detect on a few selected frames, render proposed boxes and let the user accept, edit or reject them.
5. Turn an accepted proposal into an object identity, then offer assisted tracking from that frame.
6. Add batch processing with progress and cancel only after single-frame suggestions work reliably.
7. Record suggestion source, model version and acceptance decision. Keep model proposals out of confirmed exports.
8. Consider task-specific training later only when consented labelled examples and held-out test clips exist. Training requirements are a separate decision; browser inference does not mean practical browser training.

Check: supported and unsupported classes, empty frames, duplicates, rejection persistence and false boxes. Compare completion time with manual labelling; release only if suggestions reduce work on the target footage. Follow the shared checklist.

## Phase 5 segmentation

Stack: manual polygons initially; MobileSAM candidate for local mask suggestions. SAM 2.1 Tiny remains an optional later video-mask experiment. Dependency: Phase 1 polygons, Phase 3 review and passing browser mask benchmark.

1. Prove both image encoder and mask decoder execute locally; reject server-assisted embeddings as a local solution.
2. Suggest a mask on one selected frame from a box or clicks. A mask means the pixels belonging to the object.
3. Add positive/negative clicks to include or remove parts, then a manual correction path.
4. Display masks, boxes and source video separately; never hide the evidence under a solid overlay.
5. Save compact masks in Convex file storage with object/frame/version references rather than inserting huge pixel arrays into one database record.
6. Add mask review and exact-shape export, with enough dimensions and encoding information to reconstruct the pixels.
7. Benchmark selected frames through time. MobileSAM alone is not a video tracker; frame-by-frame outline proposals still require identity handling and review.
8. Only attempt full SAM 2.1 video masks if conversion, memory and browser timing pass. Do not add it solely because its native demo is fast.

Check: thin edges, overlapping objects, hands over cloth, small objects, memory limits and exported-mask reconstruction. If model inference fails, manual polygons remain available. Release manual masks first if useful, then single-frame suggestions, then video suggestions only when proven. Follow the shared checklist each time.

## Phase 6 time segments connected to objects

Stack: existing speech-command handler, timeline, Convex and CSV/JSON export. No new vision or chat model required. Dependency: object identities from Phase 1.

1. Preserve current start/stop/label voice behaviour and existing saved intervals.
2. Allow an action interval to refer to zero, one or several tracked objects without changing the action's name.
3. Show selected objects and their visibility alongside the action interval.
4. Flag actions that refer to uncertain/absent objects for review; do not automatically rewrite the user's annotation.
5. Export the new links through a new structured format while leaving existing four-column exports compatible.
6. Test recogniser denial, an unsupported browser, edited intervals, deleted/archived object references and saved-work refresh.

Check: label an action involving iron and shirt, reload, review and export; identities and times remain linked. Real microphone recognition needs a spoken browser check, in addition to injected speech-result tests. Release through the shared checklist.

## Layer 7 3D point clouds deferred

Not part of the browser-video release. No model selected or 3D accuracy claim made.

Future stack candidate: browser WebGL rendering, for example Three.js, with Convex file storage and frame-linked 3D annotations. This is a proposal, not a selected dependency.

Future microsteps: confirm one supported lidar format and units; load a small point cloud; test camera controls; draw and edit a 3D box; save object identity and coordinates; export and reconstruct the box; measure large-file memory; add review and ownership checks. Real lidar is different from estimating depth from an ordinary video. Deploy a manually usable viewer and editor before considering model suggestions, using the shared checklist. Requires a separate approved scope.

## Layer 8 labelling as a service deferred

No free model supplies human labellers. This is an operations layer, not an AI feature.

Future microsteps: establish actual available labellers and reviewer responsibilities; define pricing and turnaround; agree handling of customer footage; add Convex Auth and permissions; implement assignment and delivery; audit access; pilot a real job; verify reviewed output and export. Payment and external communication choices need separate approval. Do not put staffing or turnaround promises on the website before they exist. Publish operational tools only after a real pilot, using the shared checklist.

## Release checklist used for every layer

1. Finish one useful slice; protect existing saved footage and annotations. Database additions start optional or in new tables, never by making an unpopulated field mandatory in existing records.
2. Run npm run build. Run the existing important browser checks plus one meaningful check for the new behaviour. Model checks record actual model results, not mocked accuracy.
3. Inspect laptop and phone layouts. AI support may remain laptop-only, with a clear manual path elsewhere.
4. Save a named working Git checkpoint. Push the code to GitHub. A push is not a deployment.
5. Run npm run deploy. This updates the existing Convex backend and publishes the frontend at the .convex.site address.
6. Verify published model/runtime files: correct version, licence notices, successful downloads, browser worker loading and cache updates. Larger files may need an authorised storage-serving route; do not assume large assets behave like the current tiny images.
7. Open the live URL in a fresh session and a returning session. Do the real new action, save, refresh, review and export. Also recheck root opening page and one-click trial.
8. Exercise failure: missing model, cancelled processing, unsupported laptop and offline/network loss. Distinguish locally generated drafts from data confirmed saved to Convex.
9. Record what passed, measured limitations and the exact commit/deployment. Enable the feature for users only after its gates pass.
10. If a release fails, publish the previous known-working frontend through Convex and preserve any new data. Never undo a data change by deleting user annotations or force-pushing history.

## Delivery order and progress

Phase 0 started 4 October 2026. See [measured browser report](benchmarks/nanotrack/REPORT.md): NanoTrack V3 runs locally in Chrome/Edge on CPU and graphics after a pinned shape repair; CPU is faster here. Fifty trial frames finished in 1.42–3.07 seconds. Controlled disappearance produced high-scoring false proposals on 12/15 absent frames. All experiment rows remain Needs checking with no accepted box. Tracking is not integrated or deployed. Real disappearance footage, memory, internet cold download and weaker-laptop validation remain open; Phase 0 is not complete.

- [ ] Phase 0: browser benchmark and model decision. Corrected moving-iron check at 11–21 seconds passed decoded-frame/safety assertions on 6 October 2026; proposals visually follow the iron in six inspected frames. No accuracy percentage claimed. Complete disappearance, identity, peak-memory, cold internet download and weaker-laptop gates remain open; see benchmarks/nanotrack/REPORT.md.
- [x] Phase 1a: editable boxes and object identities deployed 4 October 2026. Live drawing, move, resize, undo, privacy and refresh checks passed; the opening-page check passed too. See PHASE_1A_PROOF.md for timing limits.
- [x] Phase 1b: editable polygons and spatial JSON export deployed 5 October 2026 (`2efdb7f`). Corner edits, undo, saved-work restore, disqualification/recovery and shape-aware export passed on the live website; laptop and phone layouts inspected. See POLYGON_PROOF.md.
- [ ] Phase 3a: recoverable manual box review deployed 5 October 2026 (`867f4b2`); polygon review also deployed (`2efdb7f`). Geometry edits reset review. Richer revision history remains. See OBJECT_REVIEW_PROOF.md and POLYGON_PROOF.md.
- [ ] Phase 2: manual absent/Needs checking spans and explicit same-object reappearance confirmation deployed 5 October 2026 (`7092d16`); all 13 live browser checks passed. Voice selection, boundary marking, visibility saving and safeguarded reappearance added (`2da1181`); four relevant live browser checks passed, phone/laptop layouts inspected. Real microphone recognition still needs a spoken check. See VISIBILITY_PROOF.md. Browser-local assisted tracking remains blocked by the model safety and hardware evidence gates. No automated tracking released.
- [ ] Phase 3b: local track-review preview built 6 October 2026: short moving-iron cards, accept/disqualify swipes, recoverable decisions, confirmed frame corrections and safe sampled-track export. Browser flow and laptop/phone layouts checked; see TRACK_REVIEW_PROOF.md. Review interface and saved trial suggestions deployed as d0089e0, deployment c39279b9-ed81-48b4-8329-b927232c01b4; three live browser checks passed. General tracking remains gated. Multi-person review only with sign-in and roles.
- [ ] Phase 4: supported-category detector suggestions.
- [ ] Phase 5a: single-frame mask editing and suggestions.
- [ ] Phase 5b: video masks only after laptop evidence passes.
- [ ] Phase 6: saved-object links to action intervals and structured action export deployed 5 October 2026 (`e71973e`). All 12 live browser checks passed; laptop and phone layouts inspected. Continuous tracking/visibility integration remains pending: frame samples are explicitly Needs checking. See ACTION_LINKS_PROOF.md.
- [ ] Layer 7 and Layer 8: deferred, not silently included in this release.

No deadlines or real-time performance guarantees are committed yet. Start with the browser benchmark; a failed model test changes the model choice, not the requirement to run locally.

Dataset services added 6 October 2026: raw collection and annotation enquiry page at /services. Code debd8f9, Cloudflare deployment 29733478. Two local and two live checks passed; laptop/phone layouts inspected. See SERVICES_PROOF.md. Requests save privately in Convex; email notifications are not connected.

Services correction deployed 6 October 2026: original portrait sample, human annotation animation, original copy and verified pilot link restored; removed public-page wait on private workspace initialization. Code 18085c5, Cloudflare 2b706ed0. Five local and five live checks passed. See SERVICES_PROOF.md.

Annotation workspace layout deployed — 6 October 2026: code bd328a4, Cloudflare f37807ba. The user's CVAT-like three-pane workbench has central footage/playback/timeline, left object tools and right voice/label/visibility controls. Pending badges disclose general assisted tracking, detection, masks and team review; they do not change the model gates above. Small public trial playback uses a browser-memory copy for reliable seeking from static hosting. Local core checks, textarea/geometry shortcut regression and all seven live browser checks passed; independent review approved the fixed layout. Laptop/phone layout and live playback inspected. Real microphone hardware remains a spoken user check. See EDITOR_LAYOUT_PROOF.md.

Workspace follow-up deployed: fb36eda, Cloudflare df68fe97. User requested the four label/manual/visibility/object-review disclosures on the left and only voice controls on the right. Three relevant local and three public-route live checks passed; live DOM/layout inspection confirmed the requested placement. Scoped independent review approved. The laptop's normal browser route remains unreliable; see EDITOR_LAYOUT_PROOF.md. No saved data or backend changes.

### 6 October 2026 — clearer annotation instructions
- Added a three-step guide: set labels, annotate, review and download.
- Replaced repeated mic prose with numbered spoken commands and a changing next-command prompt.
- Explained voice object visibility separately from drawing outlines; reappearance still requires a verified same-object outline and explicit confirmation.
- Clarified manual labelling, object review, empty clips and timeline guidance. Kept parser commands, storage, privacy and pending features unchanged.
- Desktop and phone browser inspection showed no horizontal overflow. Local object-voice and laptop trial checks passed; spoken action save/refresh and unavailable-mic guidance checked with the updated copy.
- Published as Cloudflare Pages release bef4b341. Both live voice checks passed (27.3 seconds); inspected live desktop and phone layouts. Live checks used public Cloudflare routing in the test browser because of the previously reported local Wi-Fi lookup issue; no laptop or router settings changed.

### 6 October 2026 — account journey and guided feature navigation
Real email accounts, protected saved work, upload before metadata/locked values, coloured feature destinations, source-proportion central video and right-side mic, contextual microtasks with actual-save rewards, account guide preferences, exact voice navigation/review commands and recoverable swipe review implemented. Local core/regression checks passed; independent design review approved. Google credentials, email verification/reset and a real spoken microphone check remain pending. No additional model layers released. See GUIDED_WORKSPACE_PROOF.md for evidence and release details.

Guided workspace released as code e961a76 / Cloudflare Pages 810a769a. All six relevant live browser checks passed; live desktop/phone inspected. Sign-in and saved work tested across fresh browsers. Google remains pending owner credentials; other limitations remain as recorded in GUIDED_WORKSPACE_PROOF.md.

### 6 October 2026 — Google sign-in and approved policy pages
Owner configured Google credentials privately in Convex. Live Google button and callback checked; owner confirmed actual Google sign-in works. User reviewed and approved privacy and terms with a contact address, subsequently removed by request. Public policy pages at /privacy/ and /terms/ linked from homepage; static HTML available without sign-in. Code bdd1f15, Cloudflare release 51699236. Both local and live public-page/contact/home navigation checks passed; 1440px and 390px layouts have no horizontal overflow. Google brand verification remains an owner-console step; no paid custom backend domain enabled.

### 6 October 2026 — progressive account setup
Replaced stacked sign-up form with Relay-inspired Google/email choice and focused email, name, password steps. Returning users have email/password steps; optional phone stays collapsed. Back preserves answers, focus moves to the current field, password limitations remain disclosed. Actual local signup→upload→metadata→saved work→fresh-browser sign-in checks passed, alongside trial annotation/review regression. Desktop/phone and wrong-password recovery checked. Independent finish verdict: ship. No backend or data migration. Google brand verification confirmed by owner.

Progressive sign-in published: code 3f6f9c0, Cloudflare 4700e02f. Both live guided-workspace checks passed (21.9 seconds), including real signup/upload/locked metadata and fresh-browser returning sign-in. All sign-in steps fit 1366px laptop/390px phone; focus, preserved answers and wrong-password recovery checked. Live Google button enabled and correct callback opens Google. Used browser-only public Cloudflare routing; no device settings changed. Review disposition ship; DESIGN.md and sidecar updated.

## 6 October 2026 — canonical public website and focused sample release
- `npm run deploy` now runs Convex backend deployment, the frontend build, then Cloudflare Pages deployment to naive-physics. It fails immediately if any stage fails; no static website is uploaded to Convex.
- All public GET/HEAD pages at precious-fish-294.convex.site return 308 to the matching cheddarvox.com path/query. Convex Auth, discovery/JWKS and upload routes remain on Convex; existing static component storage is preserved.
- Homepage: explicit robotics/voice promise, primary orange Try a sample video with No account needed, secondary Use my own video. All five existing cards contain actual sample frames.
- Sample: immediate real first-frame preview with progress, a 15-second deadline covering setup/download/decoding, retry and home recovery, and stale-attempt protection. Bundled public footage downloads from Cloudflare; personal videos retain private Convex URLs.
- Trial only: Action labels and microphone initially, secondary tools disclosed with More tools. Native sample video controls removed; custom playback unchanged. On phones the mic follows footage before timeline. Signed-in workspace ordering and voice/data/export logic preserved.
- Sign in directly opens email/password for returning users, with a separate Create account choice and existing Google option.
- Links, buttons and disclosure controls meet a 44px minimum height; timeline rows spaced to avoid taller button overlap, public legal pages included. Services Play sample video measured 44px.
- Six meaningful local and live checks passed: full signup/upload/locked metadata/fresh-context returning account, voice navigation/review/undo, Cloudflare blob seeking/playback, 15-second stalled-download error/retry/back, direct sign-in, spoken iron hold saved/exported as iron_hold. Google flow reached accounts.google.com with original Convex callback and no Google error. Manual backend GET without required OAuth parameters is not a valid sign-in check.
- Fresh visual review found the phone mic below timeline; trial-only ordering corrected and reviewer scored the fix resolved. Four requested viewport captures and measured loading times are in outputs/; final release confirmation follows this checkpoint.
- Convex continues to report account usage above Free limits during deploy; this change does not reset previously consumed usage. No model capability or accuracy claims were added, and pending layers remain pending.
- Final release b7c0aed5: all six live checks passed again (42.1 seconds). Live first-frame/progress: desktop 0.072s, phone 0.562s; playable video: desktop 2.848s, phone 3.776s. Both root addresses show `Cheddar Vox — Voice led video annotation tool` after the Convex 308 redirect. Matching workspace query, services, privacy, terms and unknown public paths preserve destinations. Home/sign-in/services/privacy/terms/trial button/link/disclosure checks found no visible target under 44px and no horizontal overflow at 390px. Services Play sample video is 44px. Final requested home/trial captures at 1280x800 and 390x844 were taken from the live release; Chrome's test-only DNS mapping was used, without changing Windows/router DNS or HTTPS verification. Deployment raw output is outputs/canonical-deploy.log. Code checkpoint b821dd5.

## 6 October 2026 — focused trial annotation guide
- Guest trial Action labels only: replace the multi-task banner and scattered microphone prose with one guide above the video: Turn on your mic → Say start → Say stop → Say a label → Saved. Do the next one. Signed-in, object and review workspaces retain their existing interface.
- One primary mic control, saved label choices, and a closed How it works disclosure. Errors and retry saving remain visible. Shortcuts, redo instructions and dashboard command help move into that disclosure.
- Progress counts actual saved segments against segments marked so far (initially 0 of 0; a marked first segment is 0 of 1; a saved first segment is 1 of 1). There is no invented completion target. Saved is shown only after the reactive segment count increases; pending or failed saves do not claim success.
- Speech parser, command handling, mutation payloads, saved labels, annotations, exports and authenticated flows unchanged. New events report existing UI state only, including when returning to Action labels.
- Local build passes. Full authenticated signup/upload/metadata/returning flow, trial voice navigation and review/undo, guide sequence/laptop/phone layout and JSON export passed. Speech interim/final deduplication, page-refresh persistence, unsupported browser recovery and unchanged times/export values passed separately after updating stale old-interface assertions. Test speech input is simulated; database saving/export/refresh use the real backend.
- Visual evidence: outputs/declutter-before-1280x800.png, outputs/declutter-saved-1280x800.png, outputs/declutter-saved-390x844.png. Deployment and live confirmation follow.

- Final deployed release b2deec76, code checkpoint 9b425ca: all four live checks passed (43.7s) on cheddarvox.com. Both public DNS addresses served valid JavaScript and CSS and the correct page title. Requested before-mic and saved-one-segment captures at 1280×800 were refreshed from this live release; phone layout also checked.
- Live rollout initially exposed cached HTML fallback responses for new app assets. Removed the year-long app-asset cache override and refreshed both affected filenames; public assets now load correctly. Videos keep their existing cache policy. The public domain still reports a 4-hour asset cache header, so the local no-cache header must not be described as guaranteed domain-wide cache behavior.
- Final raw deployment output: outputs/declutter-deploy.log; live test output: outputs/declutter-live-checks.log. Convex still reports existing account usage above Free limits; deployment completed successfully. No claim of a physical microphone test: speech was simulated while saving, refresh, review and export used the live backend.

## 6 October 2026 — owner-approved account cleanup
- Owner explicitly selected two user IDs to keep. Private database snapshot exported before deletion to outputs/accounts-before-cleanup-20261006.zip and the Convex dashboard snapshot store; no stored files deleted. Backup and audit data are not committed or deployed to the public website.
- Dry-run checked the exact snapshot account list and both protected accounts. Removed 21 other users, 21 linked sign-in accounts, 15 sessions, 27 refresh tokens, 17 linked personal workspaces and their associated configuration/15 episode records. Removed accounts had zero saved action segments. Anonymous trial/owner workspaces were outside scope.
- Independent post-cleanup read confirmed exactly the two requested users remain and 18 protected records (profiles, sign-in data, kept workspaces/footage settings, and active trial configuration) match the backup without differences. Temporary internal-only cleanup function removed after use; app type-check and backend deployment confirmed.
- Future live signup checks should remove only the test accounts they create. This one-time keep-two authorization does not authorize deleting future real visitors. Do not automatically rerun the archived broad cleanup.

## 7 October 2026 — tester-requested trial player controls
- Guest trial only, honoring the instruction to preserve signed-in workspaces: ±5/10-second jumps, validated MM:SS:FF entry, single-frame buttons and plain Left/Right. IRON_001_trial_45s.mp4 verified from MP4 timing tables: 1080 frames, constant 24 fps. FF accepts 00–23; exact entry rejects the end of the clip and invalid frames. Jumps clamp to the clip bounds. Browser sub-microsecond seek rounding is tolerated without skipping frames.
- Shared server-side Undo/Redo for voice tags/manual segments and saved boxes/polygons; draft polygon point history stays local until saved. Ctrl+Z, Ctrl+Y, Cmd+Shift+Z work outside editable fields. Existing signed-in playback and shape undo are retained. No voice parser changes.
- Trial segment deletion is reversible via an internal hidden flag; queries/exports exclude hidden records. Restoring an edit preserves original annotation IDs, creation times, source, segment number, labels, geometry and original review values. Export formats remain unchanged. History stores the last 100 saved edits and survives refresh; a new saved edit clears redo. If a record changed outside this history, restoration rejects rather than overwriting it.
- Real Chrome trial checks: all four jump buttons; 00:11:12 -> 11.5 seconds; frame buttons and arrows -> 1/24 second; invalid FF and clip bounds; editable-field arrows; voice add/edit/delete and all three keyboard shortcuts; box move/delete and restored IDs; draft/saved polygon point recovery; refresh; 390px overflow; original voice deduplication and JSON fields. Speech input simulated; video decoding, database saving/history and exports real. No physical microphone test claimed.
- Read-only backup comparison confirms 18 protected records unchanged and exactly the two owner-selected user accounts still present. No signup tests run.
- Local captures: outputs/player-controls-1280x800.png and outputs/player-controls-390x844.png. Final deploy and live results follow.
- Released at https://cheddarvox.com via Pages deployment edb86e44 (code 5b8de23). Raw deployment output: outputs/player-controls-deploy.log. All four live checks passed in 37.8s; screenshots refreshed from the live release. Both public Cloudflare IPs served current JS/CSS with correct MIME types and the Cheddar Vox title. Existing Convex free-limit warning remains; release completed successfully.
- Final read-only comparison after live checks: 18 protected records unchanged, no new user accounts. Live test report: outputs/player-controls-live-checks.log.

## 7 October 2026 — manual movement drafts (Phase 2, step 8)
- Added Draft movement between boxes under Objects & outlines. Choose two verified rectangular boxes of the same persistent object, in time order, at most two seconds apart. User explicitly confirms continuous visibility. Straight-line coordinates are calculated from saved endpoints; no vision model or remote inference. Proposals are clearly marked Manual straight-line draft, not automatic tracking.
- Every generated sample starts uncertain. Existing review cards require checking/correcting each sampled frame before acceptance, with swipe decisions, recoverable disqualification and Undo. Source boxes are preserved as provenance; changing/removing/disqualifying an endpoint invalidates accepted export. Drafts do not interpolate polygons and do not cover unsampled frames.
- Server rejects overlapping absent/Needs checking spans and an unresolved previous reappearance. Visibility changes after acceptance exclude affected tracks dynamically. Duplicate requests reuse the existing draft without overwriting its decisions. Saved speech labels, original action CSV/JSON fields, manual spatial exports and existing model suggestions are preserved.
- Browser proof uses the real trial/backend: unverified endpoints, different objects, reversed times, range >2 seconds, missing visibility confirmation, absence, explicit reappearance, duplicate submission, 11 uncertain samples, individual correction/confirmation, acceptance/disqualification/Undo, refresh, source edit invalidation, cross-workspace rejection and phone overflow. Automatic tracking/model gates remain open; this release completes the approved manual alternative only.
- No real account created. Local and live proof artifacts in outputs/movement-draft-*.png, outputs/movement-review-*.png and outputs/movement-draft-live.log. Release verification follows.

- Released code b3cfc9c / Cloudflare b6bdd468 to cheddarvox.com. Five local regression checks and five live checks passed; live runtime 1.1 minutes. Desktop/phone draft and review layouts inspected. Both public delivery IPs serve current JS/CSS and correct page title. Raw deployment: outputs/movement-draft-deploy.log.
- Read-only backup comparison after local tests found no differences in protected profiles/workspace/config records; one pre-existing authRefreshTokens record differed. No claim that all sign-in session records stayed byte-identical; these tests created no user account and this feature implements no auth writes. Two kept users remain.
- Remaining Phase 2: model-assisted tracking still gated on disappearance/identity, full memory, cold internet download and weaker-laptop evidence. Supported-category detection, image masks, video masks and team review remain pending; 3D/human labeller supply remain deferred.

## 7 October 2026 — browser-local tracking safety (not deployed)
- Built appearance consistency, invalid/abrupt geometry and competing-candidate safeguards around the existing pinned tracker. Processing stops on uncertainty; no automatic resume. Explicit confirmed reappearance box required. All proposals remain Needs checking, acceptedBox null.
- Measured actual Chrome/CPU inference: controlled disappearance/scene cut stop on first absent frame, partial occlusion stop on first covered frame, lookalike ambiguity stop before the previous raw identity jump. Moving iron keeps all 50 proposals (3.37 seconds). Explicit synthetic resume processes 15 frames; unconfirmed resume refused. Cancellation and model-load failure checks pass. No remote inference or annotation writes.
- Local preview checked and suppresses stopped outlines; app build passes. See benchmarks/nanotrack/REPORT.md and safety-results.json. The thresholds are provisional and tested on this trial/controlled fixtures, not general accuracy evidence.
- General assisted tracking stays Pending. No deployment: real disappearance/reappearance/identity, total memory, real cold download and weaker-laptop gates remain open. Saved work and existing website release unchanged.

## 7 October 2026 — inspect and test the longer actual trial
- Owner suggested existing trial as disappearance/reappearance evidence. Verified benchmark iron-trial.mp4 SHA-256 equals public/videos/iron-e05a44b0.mp4. Inspected 90 decoded frames at roughly half-second spacing across 0–45 seconds (contact sheets outputs/iron-full-0.png through iron-full-2.png). Iron enters around 9 seconds; inspected later frames show movement, rotation and hand coverage, but no full exit. This sampling cannot rule out a shorter disappearance between frames, so no real disappearance/reappearance gate is claimed passed.
- Extended the isolated worker with a bounded frame count (default still 50; maximum 1080), and the iron test host with selectable range. No production application, voice labelling, database or exports changed.
- Actual 11–44.8-second range: 169 inference samples at 0.2-second spacing. Conservative competing-candidate guard first stops at 28.6 seconds despite raw score 0.999569. All later diagnostic proposals suppressed. Normal processing stops at exactly sample 88 rather than continuing; 0 accepted annotations and 0 remote requests. This is a conservative ambiguity stop while the iron remains visible, not a demonstrated disappearance event.
- Longer diagnostic processing measured 11.43 seconds on this laptop. Results: benchmarks/nanotrack/iron-long-results.json; reproduce with check-long-iron.mjs against the local benchmark server. Full contact-sheet generator: inspect-full-iron.mjs.
- Automatic tracking stays local/Pending. Next evidence needed is the precise claimed disappearance interval or another clip version, plus remaining memory/cold-download/weaker-laptop gates. Existing deployed tool untouched.

## 7 October 2026 — correct and resume local tracking
- Diagnosed 28.6-second stop: a second high-score overlapping candidate (IoU 0.452 against the selected candidate) competed as the iron rotated. Exposed candidate geometry for developer inspection; no confidence/appearance thresholds weakened and no automatic identity choice added.
- Local iron preview now runs 11–44.8 seconds and displays the exact stopped frame. Draw a corrected box with mouse/touch or use keyboard-accessible numeric fields; Confirm box and continue explicitly starts a new confirmed template at that frame. Empty and out-of-frame boxes keep confirmation disabled. No automatic resume or accepted annotations. Browser video Blob URLs released after each run.
- Real browser walk: stops at 28.6; corrected box [224,132,62,128] resumes at next sample 28.8; processes 15 samples then stops again at 31.6 for ambiguity. All proposals remain Needs checking. This improves recovery, not uninterrupted automatic tracking accuracy. Remote inference and database writes: zero.
- Existing safety regression checks passed (controlled absence, hand-cover fixture, lookalikes, scene cut, refused unconfirmed resume, confirmed resume, earlier moving-iron range). App build passes; production asset hashes unchanged. Desktop/390px local correction layouts inspected with no horizontal overflow. Saved test/evidence: check-recovery.mjs and recovery-results.json; screenshots in outputs/iron-recovery-*.png.
- Remains local only; automatic tracking still Pending until model and hardware gates pass. Next: measure correction frequency and box accuracy across the remaining rotations before considering a production integration.

## 7 October 2026 — remaining iron motion and frame-density audit
- Continued local test through 44.8 seconds with developer-confirmed boxes at each stop. At 5 samples/second, 169 inference samples required 8 corrections: 28.6, 31.6, 31.8, 36.8, 39.0, 43.4, 43.6 and 44.6 seconds. Every stop suppressed its proposal. Between checkpoints 161 proposals remained Needs checking; 0 accepted annotations. Consecutive index/stop/resume assertions passed in the aggregate audit.
- Stop-frame and periodic snapshot inspection: rapid sideways movement at 31.8 can leave the raw tracker on the shirt; later rotations produce competing candidates. At 43.4 the iron approaches/crops at the top edge; at 43.6 its rapid return causes an abrupt geometry stop. No full disappearance claimed. Corrections were manually drawn test inputs, not user-approved annotations. Periodic visuals are not a quantified per-frame accuracy score.
- Tried 24fps processing with unchanged safeguards. Initial diagnostic exposed duplicate decoded frames caused by seeking on exact boundaries; that result is invalid and was replaced. Fixed the isolated host to seek inside the known 24fps trial frame and tightened callback tolerance for dense sampling. Saved regression asserts distinct decoded times and <1ms timestamp error for every processed frame.
- Valid dense run: 244 inference frames (245 including initial reference), first uncertainty at 21.1667 seconds, 31.54 seconds processing on this laptop. It stops earlier than the 5fps run, so it does not demonstrate better automatic tracking and is not promoted. All proposals remain Needs checking; no remote requests or annotation writes.
- Rechecked desktop/phone correction flow after decoding fix: first stop remains 28.6 and confirmed restart stops at 31.6, with invalid/empty box rejection. Model safety regression and app build verification follow. Evidence: iron-motion-audit.json, iron-dense-results.json, check-iron-section.mjs, check-iron-dense.mjs. Automatic tracking remains local/Pending.
- Next useful experiment: compare a tighter confirmed initial iron box against the broad original reference, with the same safety checks and independent box references; do not weaken uncertainty thresholds to remove interruptions.
- Final verification: existing model safety regression passed all controlled absence/partial-cover/lookalike/scene-cut and explicit resume checks. Corrected-frame recovery test passed, including 390px overflow check. App build passed with unchanged production asset hashes; existing auth dependency emits its prior non-failing bundler warning. No deployment performed.

## 7 October 2026 — starting-box comparison
- Tested three explicit developer-selected starting references on the identical current trial at 11 seconds, five samples/second, with unchanged uncertainty/appearance/geometry checks. Existing [142,85,130,90] first stops at 28.6; smaller margin [148,90,120,83] at 29.8; visible-front patch [181,105,88,66] at 12.6. Measurements: 88 / 94 / 8 inference samples, roughly 4.42 / 4.86 / 0.24 seconds processing in this warm local run.
- Inspected initial and periodic outline contact sheets plus the smaller-margin stop frame. Original reference is already close to the iron bounds; the hand overlaps the object rather than occupying removable outside whitespace. Smaller margin may trim the rear edge. Visible-front patch is explicitly not a full-object box and cannot replace the object's outline.
- A 1.2-second later first stop is a limited one-clip result, not improved general accuracy or fewer whole-clip corrections. No production change adopted. All proposals Needs checking, zero accepted annotations/database writes/remote requests. Distinct decoded timestamps and <30ms decode error checked. Saved evidence: check-iron-boxes.mjs and iron-box-comparison.json; local visual contact sheets outputs/iron-box-*.png.
- Automatic tracking remains Pending/local. Next meaningful step is manually referenced box-accuracy checks on turning/fast-motion frames before changing the model or reference policy.

## 7 October 2026 — exact-frame box reference audit (supersedes eight-correction count)
- Marked 12 selected difficult decoded frames without model overlays, using approximate visible-iron bounds on 640×360 frames. Hidden extent is not invented. Developer references are not independent annotator labels, accepted annotations or a representative accuracy benchmark. Added explicit frame times and notes for blur/hand coverage/top cropping in iron-box-references.json.
- Found the previous 31.6-second test correction [177,76,116,104] was misplaced. Replaced with checked [80,48,125,114]. Prior later interruption counts are tainted; historical iron-motion-audit.json now explicitly marked superseded. This was a test-reference error, not a deployed/user-data edit.
- Repeated actual browser inference for all corrected checkpoints: five corrections at 28.6, 31.6, 43.2, 43.4 and 43.6, then reaches 44.8. Confirmed 169 consecutive inference samples, 164 proposals, suppressed proposal at every stop, zero accepted annotations and zero remote requests. With corrected 31.6 template, tracking continues uninterrupted to 43.2 rather than the earlier spurious 31.8 stop. The current decoder's 43.6 restart reaches the end without a 44.6 stop.
- Compared seven non-stopped proposals against exact matching reference frames: selected box overlap (intersection over union) mean 0.6707, minimum 0.5196. These numbers describe selected approximate boxes only, not percent accuracy. Four selected frames have suppressed proposals and are reported separately; initial reference is excluded from prediction scoring. Inspection shows oversized width/height during rotation and extra arm/shirt area; proposal review remains necessary.
- Reproducible run/assertions: check-iron-reference-audit.mjs. Full corrected evidence: iron-corrected-audit.json. Visual comparison: outputs/iron-reference-comparison.png (yellow manually checked, blue suggested). Source clip hash matches current trial; every compared reference matches the inferred frame timestamp within 1ms.
- No production changes/deployment, no annotation writes, no new automatic acceptance. Existing model/hardware gates remain open. Next bounded experiment: faster width/height adaptation on turns, evaluated against these same references while retaining every uncertainty safeguard.

## 7 October 2026 — faster drawn-box resizing, local preview only
- First experiment changed the internal model size adjustment from 0.348 to 0.55/0.8. Although four checked turning frames fit better, 0.55 delayed the controlled lookalike stop from sample 30 to 32. Existing timing gate failed twice; candidate rejected, not adopted. Recorded this expected rejection with check-rejected-search-resize.mjs / rejected-search-resize.json. Internal search rate remains 0.348. Internal 0.8 is tuning evidence, not safety-validated/promoted.
- Safer implementation separates display width/height from model search width/height. Drawn-outline adjustment 0.8 is opt-in in the isolated local preview. Original model geometry, score and competing-candidate outputs stay exactly equal to baseline for all 58 compared turning-range samples (deep-equality assertions). Original safety gate stays mandatory; an additional frozen-reference appearance/geometry gate checks the drawn outline. Either gate stops the displayed proposal. All output remains Needs checking, acceptedBox null.
- Same four selected turning references: baseline mean overlap 0.6138, display 0.55 -> 0.6642, display 0.8 -> 0.7084. Same full corrected run/seven available reference proposals: mean overlap 0.6707 -> 0.7251, minimum 0.5196 -> 0.6524. These are approximate developer-reference box overlap values on this trial, not general percent accuracy. Reviewed yellow-reference/blue-suggestion output at outputs/iron-display-reference-comparison.png.
- Full 169-sample corrected sequence retains five stops at 28.6, 31.6, 43.2, 43.4, 43.6; 164 uncertain proposals and zero accepted. Controlled display-rate 0.55/0.8 runs retain smooth motion without stop; disappearance/scene-cut/partial cover stop on sample 20; lookalikes stop on 30. Whole-clip initial range still stops at 28.6. Parameter bounds checked. No remote requests or annotation writes.
- Local preview now uses display rate 0.8; general Tracker default remains unchanged. Desktop/390px correction/confirmation flow passes with original stop times and no overflow; visual layouts inspected. App build passes and public asset hashes remain unchanged. No deployment; current saved labels, voice handling and export formats untouched.
- Evidence: check-iron-display-resizing.mjs, check-display-resize-safety.mjs, check-display-reference-audit.mjs and corresponding result JSON. Remaining real absence/reappearance, independent footage, total memory/cold-load/weaker-laptop gates still open before a general release.

## Cloud project direction — approved 8 October 2026
This supersedes browser-only release requirements for FUTURE cloud models; previous local evidence remains historical, not cloud validation. Preserve existing annotation and export formats.
1. Account project grid and grouped video navigation, first-frame thumbnails, editable name, multi-file upload, real storage accounting; preserve older ungrouped videos.
2. Project-scoped guided metadata/labels, voice/typing, autosaved drafts and explicit inheritance choices. Restore navigation/playback; under-24-hour continue question only.
3. Private R2 media with owner access, resumable upload, cancellation and integrity checks. R2 enablement/account credentials are external prerequisites; don't migrate/delete originals without verified copies.
4. Team invitations requiring login, Owner/Annotator/Reviewer, self-review allowed, one editor/video. Seven-day Trash with tested dependent-record cleanup and storage accounting.
5. Cloud processing queue, explicit tool request, budget guard, idempotence, recovery and cancel-on-session-close request; no automatic paid retry/resume. Requires GPU provider credentials and testing budget.
6. Benchmark SAM 2 tracking/masks, integrate Needs review proposals into swipe review, then verified-category detection, single-frame/video masks and object-linked actions. No failed model results accepted; confirmed identity on reappearance.
7. Language assistance for setup and checked tool commands, later queries grounded in saved annotations. Requires model-provider credentials, evaluated actions and revised privacy disclosures. Existing direct start/stop/label stays intact.
Implement and verify sequentially. Do not advertise pending cloud/team/trash features as available.

### Project foundation implementation — 8 October 2026
Added account-owned projects and membership records; idempotent older-video grouping does not change original episodes, segments or storage. Project cards show name/first frame only; search, rename (700ms autosave with explicit Done), grouped video navigation, multi-file selection/upload (up to 100) and sidebar uploaded-byte accounting. Signed-in homepage/sign-in returns to projects; anonymous trial refresh remains annotation. Video playback position and unfinished rename draft are saved locally in this browser, not yet across devices. Under-24-hour continue prompt is per-project; at/over 24 hours no prompt.
Backend tests use Convex's isolated test runtime: ownership, anonymous/cross-account denial, foreign-video rejection, duplicate membership, blank names, idempotent migration and segment preservation. No real accounts created/removed. UI browser fixture checked search, rename, opening video, multi-file selection, under/over-24-hour states and no horizontal overflow at 1280x800 and 390x844. This is not an authenticated live upload walk. Existing player controls/undo/redo/refresh and voice semantics passed against actual backend. Sample retry/home/sign-in checks passed; their compact-phone check now closes expanded More tools before measuring compact mic placement. Initial sandbox browser failures were network-access-denied, resolved under existing network approval.
Build passes (existing nonfatal auth use-client bundler warning). Remaining before full agreed experience: project-specific guided setup/voice/label suggestions and inheritance choice, cross-device draft autosaving, collaborative permissions/editor lease, invitations, 7-day Trash, private R2 migration and resumable transfers, cloud job lifecycle/models and language assistance. Current uploads still use private Convex storage. No cloud model credentials or R2 binding configured; no paid processing activated. R2 enablement guidance requested by owner.

### Private R2 upload foundation — 8 October 2026
Owner enabled Standard private bucket cheddarvox and saved backend-only credentials; website GET/HEAD/PUT CORS configured. New signed-in uploads use R2 directly with owner-authenticated reservation/finalization, declared size/type HEAD verification and conditional copy to a permanent address separate from writable staging URLs. First-frame capture and existing label/metadata inheritance remain unchanged. Private playback links expire after one hour and refresh every 30 minutes; possession grants temporary access, so links must not be shared publicly. Existing Convex videos and guest trial remain unchanged; no originals migrated/deleted. Temporary upload copies older than 24 hours are cleaned in bounded batches; permanent videos are excluded.
Evidence: real Chrome on cheddarvox.com uploaded trial clip to isolated connection-check path, downloaded exact matching bytes, played 45 seconds at 848x478, unsigned access rejected (400), test copy removed. Bucket configuration inspection is unavailable to object-scoped key; direct browser behavior verifies CORS instead. Isolated Convex tests cover anonymous/cross-account denial, ownership, inherited labels, idempotent finalization, expired staging selection and preservation of permanent key. Build and 3 player/voice regression tests pass; initial regression run lacked preview server, fixed by starting it. Authenticated live project upload through UI has not been performed; no real test users created. Remaining: resumable multipart transfers, user-visible cancellation/progress, SHA-256 integrity beyond byte-count/type verification, legacy migration and cross-device guided setup. Limit currently 5 GB per video, whole-file PUT requires page open; upload link lasts one hour. No cloud model processing enabled.

### Free-plan enforcement — 8 October 2026
Backend enforces decimal 1 GB/account, 250 MB/video, five new active projects. Storage/project counts aggregate every workspace owned by the same account. Pending R2 reservations count until completed or cleaned after expiry; mutation reads/inserts serialize concurrent reservations. Presigned PUT binds Content-Length: live R2 test rejected a wrong-sized body with 403, accepted actual trial with 200, exact-byte download/playback passed, unsigned access denied; test object removed. Project creation checks backend cap; R2 begin rejects new-project uploads at cap but allows existing-project uploads within storage. Legacy Convex POST upload is closed (410, refresh/sign in), preventing old clients from bypassing reservations; legacy addEpisode also checks quota. Existing records/read/annotation/export are not capped/deleted. Cloud AI remains unimplemented/disabled; no new paid processing path.
Workspace sidebar displays storage /1 GB, 250 MB/video, projects /5, pending reserved bytes and Cloud AI unavailable. Isolated tests cover exact cap boundaries, over-cap rejection, combined account workspaces, reservations, existing-project addition and existing video preservation. Existing old-video grouping may exceed five to preserve prior work; no new groups can then be created. Historical upload records over 1000 require manual quota review rather than silently undercounting. R2 keys remain private, temporary link possession grants time-limited access. No prevention of malicious mass account signup is claimed.

### AI preparation and shared free-storage guard — 8 October 2026
User asked to build model-assisted features while staying within Cloudflare free allowances. Per-account quotas alone do not protect shared R2 storage. Added a conservative 6 GB site-wide app-managed upload reservation ceiling, counting 2x declared size while staging/final copies may coexist and 1x permanent size after cleanup. Atomic indexed reservation reads prevent new-account/concurrent-upload bypass of this cap. No saved records removed. Global cap test passes along with existing quota/privacy tests. Actual private bucket aggregate inventory: 0 bytes, 0 objects, complete scan at this check (not account-wide monthly billing usage).
Budget clarification remains pending: strict zero AI budget vs approved monthly spend. No model calls enabled. Cloudflare official pricing provides 10,000 Workers AI neurons/day on Free, refusal after allocation, and R2 Standard 10 GB-month/1M Class A/10M Class B free allowances. Some frontier models require paid billing; do not enable them under a zero-cost assumption. Shared R2 request/billing usage and other buckets cannot be inferred from application upload totals; no blanket no-charge guarantee claimed. No AI credentials/Workers Free plan verified yet. Compare Qwen3-30B-A3B and Llama 3.3 70B on actual checked metadata/command cases before declaring a best model. Vision tracking/segmentation must use dedicated models with benchmark gates rather than LLM-generated boxes. Keep current voice parser unchanged.
Sources checked: https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/r2/pricing/ ; https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/ ; https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ ; https://github.com/facebookresearch/sam2 .
Additional current vision candidate: Meta SAM 3.1 Object Multiplex (official release https://github.com/facebookresearch/sam3/blob/main/RELEASE_SAM3p1.md). Evaluate text/point-prompt video segmentation/tracking against SAM 2, license/access/hardware/cost gates first. Cloudflare hosting/free GPU availability not verified; do not expose as live.

### Project metadata and label dictation — 8 October 2026
New project uploads now open a one-question setup: choose metadata fields, answer each by voice or typing, then build an editable action-label list. Existing browser speech recognition is reused for dictation only; video start/stop commands are unchanged. Final speech results enter the answer once; interim speech does not save incomplete labels. Users can skip individual questions or go straight to annotation. Drafts save locally immediately and to Convex after a short pause; refreshing the setup route restores the question and answers. Confirmed settings apply only to the uploaded videos in the same project. Users can offer settings for future videos or choose separate settings. Existing locked metadata cannot be overwritten.
Episode-specific metadata fields preserve older workspace defaults and existing CSV/JSON structures. Backend tests verify ownership, atomic rejection of other-project batches, locked values, unchanged existing segments and draft/confirmed-data separation. Seven backend tests pass; desktop/390px browser fixtures verify dictated answers, editable label lists, refresh recovery, Skip and no horizontal overflow. Real microphone recognition and authenticated live upload-to-setup have not been walked; speech results were simulated and no real test users were created. Unfinished setup reopening from the project grid and cross-device multi-video batch recovery remain pending; drafts are not claimed to restore every navigation action. No LLM inference enabled or paid model calls introduced.
Release verification: npm run deploy completed, Pages release 7aa43054. Existing player/voice browser tests passed against the live trial (3 tests); local runs could not buffer the old Convex-sourced trial, so they do not count as passes. Live public home/trial/sign-in checks passed before release; repeat after release recorded below. Convex still reports existing account usage above Free limits; this release introduces no model processing or new video copies, but cannot claim the whole account is below its limits.
Post-release public checks passed: correct Cheddar Vox title, trial ready in 3.529 seconds, refresh retained trial, sign-in gate preserved. Authenticated new setup verified with isolated backend/UI fixtures, not a live account.

### Resume unfinished project setup — 8 October 2026
Project-grid video opening now checks the owner's setup draft before choosing a screen. Unfinished setup resumes its saved question; completed or explicitly skipped setup opens annotation. Upload batch IDs are stored with the private draft, so opening the primary video on another device retains the same batch for confirmation. Initial draft is saved before opening setup. Completion/Skip are recorded separately from draft answers; late autosaves cannot change them back to pending. Existing drafts without a state are treated as completed when confirmed setup fields exist, preserving previous users' finished setup. Skip does not apply metadata or labels. Trial navigation and existing annotations/exports are untouched.
Tests: backend ownership, same-project batch checks, pending/batch restoration, completion, Skip, rejected cross-account Skip and late-save protection passed with the existing seven backend tests. Existing setup browser fixtures at 1280/390 passed (refresh, dictation, confirmation, Skip). Authenticated live cross-device project reopening is not yet manually tested. Opening a secondary video of an unfinished batch does not redirect it to the primary video's setup; recovery is attached to the primary uploaded video. No AI inference or new video copies introduced.
Released with npm run deploy, Pages b772bccb. Post-release public checks passed: title, sample ready in 3.153 seconds, trial refresh and private-project sign-in gate. Real signed-in cross-device recovery remains a user walkthrough, not claimed as live-tested.
