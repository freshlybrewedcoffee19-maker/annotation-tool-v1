# Marketing video feedback — isolation and verification plan

Checkpoint: `4617d9f`. Baseline: TypeScript passes; 37 backend tests pass.

## Boundaries

- `/marketing` is a new entry page; `/marketing/board` and `/marketing/card/:id` are signed-in destinations. `/marketing/review/:token` is public, view-only.
- Route marketing before the existing workspace provider. Existing homepage, routes, annotation components and persisted workspace choices stay unchanged.
- All marketing records use new `marketing*` tables. No marketing video becomes an episode, annotation segment, label, project member, or dataset record.
- Reuse CheddarLogo, AnnotationVideo and EditorPlayback without changing their defaults. Scope all new CSS beneath `.marketing-app`.
- Reuse Convex Auth and the existing private R2 client. New object keys use an exclusive `marketing/` namespace. No hosting or deployment-script changes.
- Audio is an original recording, not a reusable label. Corrected text and audio belong to one feedback segment and immutable version ID. Local draft recovery retains text, timestamps and recorded blobs after network failure.
- Public media is proxied through an access check on every request, including range requests. Do not expose R2 keys or persistent signed URLs to review viewers. Link revocation and editor removal are checked again on media access.
- Card ownership and editor membership are checked server-side. Public links grant no mutations. Invitations are matched to a signed-in account's verified email. Access requests never grant access automatically.
- Approval records the current version. New revisions clear approval. Finalisation locks uploads, confirms an exact version snapshot, deletes only exclusive earlier marketing video objects, records per-file cleanup, and can retry. Original audio, comments and history survive. Reopening is owner-only.

## Preview and proof

Current verification rule: never create test users, sessions, files or application records in a local or cloud Convex deployment. Use convex-test only in memory for backend rules and a separate browser-memory preview for interface checks. Do not run account-seeding scripts or integration tests that write to a deployment. The earlier deployment-backed checks below are historical, not permission to repeat them.

Visual direction is fixed by the request: the current Cheddar Vox palette, Segoe UI, corgi mascot, compact panels and existing controls. The board is four status columns, not a new brand. Card and public review share the same player and feedback layout. No generated assets are needed.

## Resumed work — 13 October 2026

Recovered all saved implementation rather than rebuilding it. Completed the isolated local preview at http://127.0.0.1:5175/marketing. Live backend, Cloudflare hosting, existing annotation records, and storage CORS rules were not changed.

Fixed duplicate playback controls on version changes (two sibling React components shared a key), scoped unfinished video uploads to the signed-in account, added an explicit discard control for unfinished local uploads, and corrected confirmation-checkbox sizing. The development-only upload relay in Vite lets this local preview upload to private marketing staging keys; published uploads still go directly to the existing storage service.

Verification: 42 backend tests passed; TypeScript and production build passed. The browser test covers real private uploads, recorded audio with simulated microphone input, transcript correction, text/audio recovery after reload, public playback, editor access requests and replies, revisions, one playback toolbar after version changes, exact deletion confirmation, finalisation, retained audio and comments, revoked media range requests, reopening, and desktop/mobile overflow checks. Existing sample playback and voice boundary/save/reload checks also pass. Updated the older voice test to check exported data directly because its previous export button is behind the trial sign-in gate; the annotation UI was not changed.

Actual microphone hardware and the browser's external speech-recognition service still need a human preview check. Browser automation uses a simulated microphone and speech results. The build retains existing bundle-size and dependency-notice warnings.

Screenshots and the latest populated public preview address are in `outputs/marketing-preview/`; `result.json` contains the review URL. These are disposable local test records, not customer data. Preview accounts are separate from live accounts.

To resume local servers, use Node 24 (the saved private runtime is `.np-tools-private/node-runtime/node-v24.21.0-win-x64/node.exe`), run Convex with `dev --env-file .np-tools-private/marketing-preview.env`, and run Vite on port 5175 with `VITE_CONVEX_URL=http://127.0.0.1:3210` and `VITE_CONVEX_SITE_URL=http://127.0.0.1:3211`. Do not change `.env.local` or deploy to the live backend for preview.

Publishing remains pending the user's preview review. Do not run `npm run deploy` yet.

## Simplified workflow — 14 October 2026 (current scope)

User approved: **upload → feedback → revision → done**. Creative requests, campaign briefs, dates and approval chains are parked. Existing annotation screens and saved annotation data stay unchanged.

- Board columns are Feedback, Revision and Done. Uploading starts in Feedback; adding feedback moves the video to Revision; uploading a new cut returns it to Feedback.
- One owner-only Mark done button replaces the approval dropdown, review checklist and finalisation controls. Done keeps every video version, recording, comment and reply. Continue feedback reopens the ordinary flow. No new deletion path was introduced.
- Existing stored status values remain compatible: `approved` is displayed as Done and `revised` is grouped under Feedback. No schema migration or data rewrite is needed. Earlier finalised records remain readable; any already-running legacy cleanup retains its recovery control.
- Sharing/editor access and version history are collapsed beneath the workspace. Existing server access rules are retained.
- Replaced the account-creating marketing browser test. The new test imports the real marketing components with browser-memory substitutes, blocks external requests, and verifies no Convex connection is made. The browser fixture is excluded from the production entry point. Optional example display data lives only in the current tab.
- Local Convex remains stopped. No deployment was pushed and no test records or users were added to Convex in this session.

Preview command: `npx vite --config tests/marketing-preview.config.ts --host 127.0.0.1 --port 5176 --strictPort`.

Preview screens: `/marketing`, `/marketing/board?example=1`, and `/marketing/card/preview-video?example=1` at `http://127.0.0.1:5176`. No sign-in is needed for this interface-only preview. It uses sample footage and resets when refreshed; it does not prove real authentication, storage uploads or transcription services. Those remain unexercised against a running deployment under the no-test-records constraint.

Checks: 43 in-memory backend tests pass; simplified browser flow passes on desktop and at 390px, keeping both versions and feedback on Done and reopening correctly. TypeScript and production build pass. Screenshots are in `outputs/marketing-simple-preview/`. Existing dependency/bundle warnings remain.

## Entry copy and annotation UI correction — 14 October 2026

The user rejected the lengthy entry copy and the separate two-column feedback-tool design. The entry page now says **Video feedback in two steps: 1. Upload your video. 2. Say what to change.**

The feedback tool now reuses the existing signed-in annotation components: WorkspaceLayout, WorkspaceToolRail, MediaNavigation, AnnotationVideo, EditorPlayback and TrialTracks. It keeps the same tool rail, collapsible left controls, microphone placement, video canvas, playback controls, timeline and saved-row structure. Marketing changes the data and relevant labels, not the underlying annotation layout. Its tool rail exposes Feedback, Review and Share; annotation-only object/mask/tracking tools are not shown as nonfunctional marketing controls. Sharing is now in that existing side panel; version history remains below.

Shared components gained optional rail filtering/labels and an accessible selection label. All original defaults, annotation actions and stylesheet ordering remain unchanged. Marketing feedback still uses its own records and audio/transcript recovery. Revisions, Done, and old cleanup recovery remain intact.

Verified: 45 in-memory tests, including original annotation navigation defaults; browser-only upload, feedback correction, reply, sharing, revision, panel collapse/expand, Done and reopen; desktop/phone screenshots; TypeScript and production build. Local Convex remains stopped. No deployment changes or saved test accounts/records.


## Marketing entry and navigation resume - 14 October 2026

Resumed from committed checkpoint `9788090`, preserving the completed workspace. Updated entry headline to **Give video feedback. Skip writing timestamps.** Supporting copy covers timestamped clips, voice recordings, editable transcripts, invited-editor revisions and public read-only links. Replaced the marketing header link to the annotation product with marketing-home navigation; added an accessible name to the marketing logo. Existing sign-in already preserves the marketing return address.

Verification: 45 in-memory backend tests passed; production build passed with the existing dependency and bundle warnings. Both marketing browser checks passed: upload, timestamped feedback, text correction, replies, sharing, revisions, Done/reopen, desktop/phone layout, public read-only controls, and sign-in-screen return routing with browser-memory authentication. Inspected entry and mobile workspace screenshots in `outputs/marketing-simple-preview/`. The browser authentication substitute is preview-only, not a real sign-in verification. No production annotation code, live backend, saved user records, hosting or deployment settings were changed.

Preview remains at http://127.0.0.1:5176/marketing; populated workspace: http://127.0.0.1:5176/marketing/card/preview-video?example=1 . Actual microphone hardware, speech service, real authentication and invited-editor storage uploads remain unverified in this browser-memory preview. No publishing approval requested or deployment run. Next: user reviews preview, including actual microphone/service validation before publishing approval.


## Expanded implementation request - 14 October 2026

Checkpoint before changes: `8f58c07`. Current request supersedes simplified Done scope: four status columns, separate approval/finalisation, canonical /video-feedback routes, isolated sample, reporting and fuller voice states. Preserve existing /marketing links as aliases.

Protected regression flows: original homepage and account sign-in; private image/video uploads; projects and invited-team access; image labels and image CSV/JSON; voice/manual video segments, saved boundaries and replay; annotation review; masks/outlines/tracking; dataset CSV/JSON; account-scoped storage and private media. No production records, storage objects or deployment will be changed during development. Backend tests run in memory; browser preview remains isolated from deployment. A connected deployment check remains a disclosed limitation, not permission to push.


## Expanded video-feedback implementation - current handoff, 14 October 2026

Continued from checkpoint `8f58c07`; no completed marketing work was discarded. Canonical routes are now `/video-feedback`, `/video-feedback/sample`, `/video-feedback/signin`, `/video-feedback/workspace`, `/video-feedback/cards/:id`, `/video-feedback/review/:token` and `/video-feedback/invite/:token`. Old `/marketing` entry, board, card and review URLs map to their equivalents. Marketing has its own shell, error/recovery links, internal navigation, sign-out destination and validated sign-in returns. No links into annotation were added.

Homepage uses the exact requested headline, supporting copy, explanation and reporting benefit. Its branded three-scene explainer shows sample footage, start/stop boundaries, example audio/transcript and exact-clip review. The production sample uses the same composer/player/timeline with browser-memory practice data; backend hooks are skipped, uploads/private records are unavailable, and practice feedback resets when leaving/refreshed.

Board restored to Needs feedback / Changes requested / Revised / Approved. Owners explicitly approve the latest version; finalisation is a separate exact-version confirmation. Existing marketing storage, guarded deletion and private media proxy were reused. Interrupted cleanup now records its error and remains retryable. Deleted footage cannot play, but retained audio/text can still be reviewed; after reopening, authorised text corrections remain possible without changing deleted footage timing. Original annotation schema and records were not rewritten.

Voice now exposes Ready / Marking / Recording feedback / Editing feedback / Saving / Saved. Interim command results capture boundaries once; final feedback results produce text; MediaRecorder separately captures original audio. Manual boundaries, text-only feedback, denied permissions, missing speech recognition and interruption are handled. Drafts include audio blobs and upload progress, are account/card/version-scoped, and survive failed saves/reload. Recovery waits for account details to avoid overwriting a draft under the wrong key. Navigation warns before leaving unsaved work, stops recording and keeps recoverable real-card drafts. Sample drafts are explicitly disposable.

Editors can author feedback and correct/resolve their own comments; owners can correct/resolve any card feedback. Original audio is retained when text changes. Replies have optional retry keys. Invitations now support random tokens and seven-day expiry while retaining compatibility with old verified-email invitations. Acceptance checks verified identity; access removal and public-link revocation still recheck media requests. New activity events retain version identity; reporting exports actual available card/version/feedback/reply/activity information, explicitly limited to the latest available 200 activity events, with no invented KPI metrics.

Shared changes are limited to optional marketing sign-in copy and optional marketing timeline mode; annotation defaults are covered by regression tests. The original main entry changes only its marketing route selection. Existing image/video uploads, labels, masks/tracking, project access, sign-in/recovery, exports and private-storage backend checks remain green. The original homepage was also opened through the real production entry with all backend traffic blocked and still reads ?Your voice. Your annotations.?

Preview: `npx vite --config tests/marketing-preview.config.ts --host 127.0.0.1 --port 5176 --strictPort`. Homepage: http://127.0.0.1:5176/video-feedback . Sample: http://127.0.0.1:5176/video-feedback/sample . Populated card: http://127.0.0.1:5176/video-feedback/cards/preview-video?example=1 . The fixture uses browser-memory accounts/records and development-server memory for disposable uploaded bytes. It does not connect to Convex or private cloud storage. Production sample isolation is implemented separately from this test fixture.

Verification: 49 in-memory tests pass, including owner/editor/stranger/public access, invitation identity/expiry/removal, media revocation, retry keys, version-scoped events, exclusive-file cleanup/partial retries, original image/video/export/security regressions and shared-component defaults. Browser checks cover full flow, marketing navigation/sign-in return/back-forward/sign-out/invalid links, spoken boundaries and duplicate events, actual browser audio capture with a simulated microphone, text correction and exact playback, microphone fallbacks, audio/text draft recovery after failed save and slow-account reload, upload/cleanup retry, and JSON report contents. Screenshots are in `outputs/video-feedback-simple-preview/`. Production build and TypeScript pass with the pre-existing bundle/dependency notices.

Limits: authentication in browser checks is a memory substitute; speech results and microphone input are simulated. A connected Convex/Cloudflare deployment, real Google/email authentication, private storage CORS/range delivery, real microphone hardware and the browser speech service have not been exercised in this resumed session. Backend permission/deletion checks used separate in-memory identities, not cloud test accounts. No real files were deleted. No new service, deployment, hosting change, live backend push or test-user creation was performed. Do not run deploy until the user approves; connected verification remains a release gate.

Final browser run: all six checks passed, including actual portrait footage on desktop/phone with panel changes. Landscape and portrait use contain sizing; no stretching or page overflow was observed.
