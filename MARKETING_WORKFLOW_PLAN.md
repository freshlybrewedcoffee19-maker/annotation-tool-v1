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
