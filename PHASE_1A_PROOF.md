# Manual object boxes — 4 October 2026

Implemented and checked locally; no website release or live backend update was run.

Open Annotate, pause the video, select Object boxes, enter a name, and choose Draw box. Drag to draw; drag the box to move it, or its corners to resize it. Saved boxes can be selected from the list to return to their frame. Choose an existing object to give it another box at a different time. Identical names still have separate object IDs. Object records survive deleting their last box. Delete and undo affect boxes, leaving time segments and exports unchanged.

Coordinates are fractions of the original video content. The overlay measures the actual displayed content, including letterboxing, with a resize observer. Pointer edits save at release; Escape, pointer cancellation, playing, or seeking cancels unfinished edits. Focus the drawing area for arrow-key movement, Alt + arrows for resizing, Delete, and Ctrl/Cmd + Z. Undo is retained for the current editor session, with up to 50 changes.

Convex stores object identities separately and the video’s boxes in a new table. Every read and write checks existing private workspace ownership. Failed saves show an error and restore confirmed geometry. The manual limit is 2,000 boxes per video.

Timing: use the browser’s decoded frame presentation time when available, otherwise video time. Do not invent a decoded frame index: `frameIndex` stays null because the browser callback does not supply an absolute source frame index. Previous/next steps use the supplied frame rate and are explicitly estimates. Exact frame-index decoding and variable-frame-rate stepping remain future work. Boxes display only at their saved time, with a 0.5 ms comparison tolerance; they are not interpolated or tracked.

Validation:

- `npm run build` passed.
- All 10 Playwright tests passed against an isolated local Convex server; Chrome and Edge workspace checks passed.
- The new full-flow test passed again after adding read/write privacy and cancellation checks: draw, move, resize, undo, delete/restore, refresh, same object on multiple frames, and distinct objects with the same name.
- Laptop and phone screenshots were inspected; content alignment was measured after resizing.
- Existing setup, uploads, voice command handler, segment review/recovery, refresh and CSV/JSON exports passed. Speech tests inject recognition results; a real spoken microphone check was not performed in this session.

Tests support `CONVEX_TEST_URL` for their direct database checks, alongside `APP_URL` for the frontend. The local trial fixture supplies the usual six labels and 32 filled sample metadata fields. Initial suite failures came from using live database settings against local workspaces, missing fixture labels, and a voice test seeking race. The database tests can now target the local server, and the voice test waits for its seek before simulating speech.

NanoTrack and Builder Pulse were not changed. Existing videos and annotations were not migrated or deleted. No deployment was run.
