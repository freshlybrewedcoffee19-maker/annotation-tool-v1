# Version 2 implementation record

Approved product scope: [IDEA_SCOPE.md](IDEA_SCOPE.md). V2 is being delivered in working pieces; this record distinguishes implemented work from the full target.

## First video slice — 10 October 2026

- Separate `/v2` workspace, with Version 1 still available. Existing projects are not migrated or deleted.
- V2 videos and shapes are separated from V1 project discovery, episode lists and exports. Private R2 uploads receive their V2 marker in the same transaction that creates the video record.
- Public sample and private video upload entry points. Account sign-in uses existing Convex Auth.
- New SVG editor: boxes, polygon corners, brush strokes, individual keypoints and whole-video classification. Select/move shapes, drag box/polygon/keypoint handles, relabel or delete before review.
- Existing VoiceLabels and voice segment engine reused. Optional V2-only tool dispatch adds spoken tool selection without changing V1 mic/start/stop/label behaviour. Tool selection is not object detection.
- Existing ReviewDeck reused for time segments. New shape cards show the video frame and annotation, with swipe, buttons, editing and undo. Verification waits for the review frame to load.
- Device draft recovery retains the expected server revision. Finished shapes queue on-device for upload. Conflicting edits stay available for backup rather than overwriting the server. Local storage failure is shown; the UI does not claim an edit was saved.
- Every shape correction returns it to pending review. Deleted/disqualified records remain in the full backup. Training exports include verified shapes only.
- COCO JSON for boxes/polygons; frame-and-COCO ZIP containing actual PNG video frames and decoded timestamps; YOLO boxes and class list for the selected frame; verified segment CSV; full JSON recovery backup.
- Browser ZIP allowance: up to 50 extracted frames, 200 million total pixels and 128 MB encoded images. Larger work retains the backup export; scalable bulk export is pending.

## Actual technology used

| Part | Technology and purpose |
| --- | --- |
| Interface | React + TypeScript + Vite, the existing web app. SVG draws editable shapes over native video. |
| Voice | Existing browser speech recognition and V1 command/timestamp engine. No new listening mode or voice-recording storage. |
| Annotation code | New V2 editor, with CVAT clamp and wrapping-box geometry extracted from fixed revision `454d60c31a59cb411d82660a3644e29d8fef7bb0`. MIT copyright and license retained in `src/vendor/cvat/geometry.ts` and `public/licenses/cvat-MIT.txt`. No full CVAT server or editor embedded. |
| Database/backend | Convex; isolated V2 tables, access checks, revision checks and real-time updates. |
| Accounts | Existing Convex Auth. |
| Private files | Existing Cloudflare R2 with short-lived signed upload/playback URLs. |
| Hosting | Existing Cloudflare Pages through `npm run deploy`; Convex remains the backend. |
| Device recovery | Browser local storage for unfinished shapes and pending shape writes. It is device-local, not an online backup. Existing V1 voice-save retry semantics are retained; offline voice segments are not added to the new shape queue. |
| Export | Browser video-frame extraction; fflate 0.8.3 creates ZIP files locally. No paid GPU or external AI processing introduced. |

Label Studio has been inspected as a reuse candidate, but no Label Studio code is included in this slice. Its root and editor-package licenses differ; inspect the selected files before reuse.

## Still pending from the agreed full scope

- Spoken object requests producing AI boxes/outlines, A/B/C ambiguity selection and temporary grid fallback.
- SAM pixel segmentation, separate instance masks, brush erasing and pixel-mask training export.
- V2 tracking, skeleton templates, 3D cuboids and their exports.
- Custom customer-funded AI model connections and cost disclosure.
- Audio intervals, image projects and mixed-media folders.
- Team assignment, collaboration permissions, reviewer workflows and analytics in V2.
- Billing/credits and final free-tier packages.
- More scalable video/project lists, complete offline media availability and richer multi-tab conflict recovery.

## Verification

- 32 code tests passed, including V2 permission/isolation checks, stale-edit rejection, safe retries, review invalidation and geometry export.
- Local V2 core browser flow passed: spoken transcript dispatch through the actual voice engine, drawing, correction recovery after reload, offline shape queue, swiping, undo, JSON and actual frame ZIP downloads, desktop and 390px screenshots.
- Browser speech is supplied controlled transcripts in automation; actual microphone recognition remains user/annotator-tested V1 behaviour, not newly claimed hardware testing.
- Private upload failed from local preview origins (4176 and 4175). The new frontend passed private upload, fresh-browser account reopening, unauthorized-read rejection and V1 list/project isolation when tested at the production origin with local build assets. Storage policy has not been broadened.
- V1 local guards: both tracking flows and password recovery passed. Shared-project upload failed at the local origin; the bundled-trial test hit its five-second media readiness timeout. Both require published-site verification; neither is silently counted as passing.
- Final deployment and live verification results will be appended after completion.
