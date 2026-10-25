# Annotation editing and CVAT import experiment

Checked 25 October 2026. Local changes only; not deployed.

## Editing delivered

- Saved video annotations have an Edit action in the sample and account workflows, and from Review.
- A dialog lets users change one label and its start/end seconds, adjust by 0.1 seconds, use the preview's current position, and preview the corrected interval.
- Save uses the existing annotation mutation. It updates the same segment ID, retains its original voice/manual source, and returns the corrected annotation to pending review.
- Cancel discards only the current correction. A failed save keeps the draft open for retry.
- The existing microphone remains mounted and its listening state is unchanged. The correction preview is a separate muted player. Background keyboard playback shortcuts are inactive while the dialog is open.
- Repeated spoken review/edit commands cannot replace an unfinished correction. Review keeps the same segment selected when timestamp edits reorder the list; undo uses the segment ID too.
- The sample's saved annotations are accessible below its timeline. Desktop and 390-pixel phone-width dialog screenshots were inspected.

## Evidence

The new tests run the actual main page, editor, player, voice controls and review interface in Chrome. Save/review functions run against Convex's in-memory test database, with synthetic accounts and annotations. All HTTP and WebSocket traffic is intercepted. No live user records are read or written.

| Check | Result |
| --- | --- |
| Original sample Review → Edit bug, before fix | 1 failed, signed-workflow control passed |
| Repeated spoken edit losing a draft, before guard | Reproduced failure |
| Timestamp reorder switching review selection, before fix | Reproduced failure |
| Final editing browser tests | 13 passed, 0 failed, 0 skipped |
| Existing V1 voice/player/export/retired-interface protection tests | 29 passed, 0 failed, 0 skipped |
| Existing voice and product-tracking evaluations | 183 passed, 0 failed, 0 skipped |
| CVAT isolated importer experiment | 9 passed, 0 failed |

The editing tests cover sample/account saving and reload, same-ID/source preservation, unchanged other segments and retained image work, cancelled drafts, failed-save retry, invalid input rejection, preview isolation, keyboard isolation, focus restoration, phone sizing, review selection/undo, and preserving a pending 4–6 second spoken annotation without restarting recognition.

Local raw evidence (ignored by git):

- `.np-tools-private/segment-editing-before.log`
- `.np-tools-private/segment-editing-review-command-before.log`
- `.np-tools-private/segment-editing-review-selection-before.log`
- `.np-tools-private/segment-editing-after.log`
- `.np-tools-private/segment-editing-regression-after.log`
- `.np-tools-private/evals/2026-10-25T10-09-35-681Z/report.md`
- `.np-tools-private/segment-editing/trial-review-edit-desktop.png`
- `.np-tools-private/segment-editing/trial-edit-phone.png`
- `.np-tools-private/segment-editing/personal-edit-phone.png`
- `.np-tools-private/cvat-import-probe/import-test.log`

Finite local TypeScript and Vite build checks also pass. Vite reports the existing dependency directive and large-chunk warnings. No watch or dev server was started. Automated speech tests supply recognition events; they do not measure a physical phone microphone.

## CVAT findings and limits

This is an import experiment, not a production export button. It executes selected unchanged functions from official CVAT revision `454d60c31a59cb411d82660a3644e29d8fef7bb0`, with hash-verified source and the real XML parser dependency. The task, media and storage are represented in memory; no CVAT account is needed.

Three synthetic temporal annotations become eight native CVAT frame tags. Overlapping/repeated labels, Unicode and exact timestamps survive when the target task has matching labels and declared timestamp attributes. Missing label names fail; undeclared attributes are silently dropped. The experiment therefore includes the required label definitions and a separate JSON backup of the exact source segments.

CVAT's frame tags attach labels to individual frames, rather than storing Cheddar Vox's time intervals directly. Its documented video-tracking export does not include classification. A safe production export needs verified frame timing, label/attribute definitions and the original source video. Existing uploads do not reliably contain frame-rate information, so assuming 30 fps would be unsafe. The candidate refuses unknown/variable timing and intervals that contain no frame.

The nine checks prove the pinned parser and binding path with documented adapters. They do not prove a full CVAT task import, server validation, persistence, real video decoding or UI rendering. A disposable task containing a synthetic video is the next integration check when a CVAT account or server is available.

Reproduction instructions and exact adapter limits: [CVAT probe README](../scripts/cvat-import-probe/README.md).

Official references: [CVAT format documentation](https://docs.cvat.ai/docs/dataset_management/formats/format-cvat/), [frame tags](https://docs.cvat.ai/docs/annotation/manual-annotation/modes/annotation-with-tags/), [pinned importer](https://github.com/cvat-ai/cvat/blob/454d60c31a59cb411d82660a3644e29d8fef7bb0/cvat/apps/dataset_manager/formats/cvat.py).

## Scope protection

No production voice-engine files, backend functions, database schemas, sign-in, hosting configuration or package dependencies were changed. No saved user data was accessed or changed. The separate Video Feedback workflow and retired drawing routes were not modified. Test downloads stay in the ignored private evidence directory. All work remains recoverable in git; no history rewrite.
