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

Use an isolated local Convex deployment and disposable test accounts/files, never publish to the live shared backend before preview approval. Test permission rules and cleanup failures with convex-test; exercise the complete browser flow against the isolated preview. Check existing image/video flows and responsive layouts. Report actual checks and limitations, not just build success.

Visual direction is fixed by the request: the current Cheddar Vox palette, Segoe UI, corgi mascot, compact panels and existing controls. The board is four status columns, not a new brand. Card and public review share the same player and feedback layout. No generated assets are needed.

## Resumed work — 13 October 2026

Recovered all saved implementation rather than rebuilding it. Completed the isolated local preview at http://127.0.0.1:5175/marketing. Live backend, Cloudflare hosting, existing annotation records, and storage CORS rules were not changed.

Fixed duplicate playback controls on version changes (two sibling React components shared a key), scoped unfinished video uploads to the signed-in account, added an explicit discard control for unfinished local uploads, and corrected confirmation-checkbox sizing. The development-only upload relay in Vite lets this local preview upload to private marketing staging keys; published uploads still go directly to the existing storage service.

Verification: 42 backend tests passed; TypeScript and production build passed. The browser test covers real private uploads, recorded audio with simulated microphone input, transcript correction, text/audio recovery after reload, public playback, editor access requests and replies, revisions, one playback toolbar after version changes, exact deletion confirmation, finalisation, retained audio and comments, revoked media range requests, reopening, and desktop/mobile overflow checks. Existing sample playback and voice boundary/save/reload checks also pass. Updated the older voice test to check exported data directly because its previous export button is behind the trial sign-in gate; the annotation UI was not changed.

Actual microphone hardware and the browser's external speech-recognition service still need a human preview check. Browser automation uses a simulated microphone and speech results. The build retains existing bundle-size and dependency-notice warnings.

Screenshots and the latest populated public preview address are in `outputs/marketing-preview/`; `result.json` contains the review URL. These are disposable local test records, not customer data. Preview accounts are separate from live accounts.

To resume local servers, use Node 24 (the saved private runtime is `.np-tools-private/node-runtime/node-v24.21.0-win-x64/node.exe`), run Convex with `dev --env-file .np-tools-private/marketing-preview.env`, and run Vite on port 5175 with `VITE_CONVEX_URL=http://127.0.0.1:3210` and `VITE_CONVEX_SITE_URL=http://127.0.0.1:3211`. Do not change `.env.local` or deploy to the live backend for preview.

Publishing remains pending the user's preview review. Do not run `npm run deploy` yet.
