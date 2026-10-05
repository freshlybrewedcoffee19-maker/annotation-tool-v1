# Manual visibility and reappearance safeguards

Added 5 October 2026. This is a manual foundation for Phase 2, not released model tracking. NanoTrack remains developer-only because its disappearance/identity gates have not passed.

In Object visibility & reappearance, choose a saved object and record a half-open span [start, end) as Absent or Needs checking. No existing outlines or actions are deleted. Saved outlines are hidden inside either span in the annotation viewer. The endpoint is available for a new same-object outline. Saving a span does not assert continuous visibility outside it.

Reappearance requires an explicitly verified saved outline of the same object at the end time, followed by the user's separate confirmation. Editing/deleting the outline or changing its review away from verified clears the confirmation permanently; re-verifying later requires a new confirmation. Polygon outlines are also supported. The confirmation is evidence at one frame, not evidence of continuous visibility after it.

Backend checks ownership, same-video object identity, finite video bounds, non-overlapping same-object spans, and endpoint outline identity/time/review. Spans can be removed and the last removal undone; undo restores the span without silently restoring reappearance confirmation. Linked-action JSON now includes referenced visibility spans; the existing exports remain unchanged. Old data needs no migration.

Build passed. Three local browser checks passed for visibility, box editing and action links. A further visibility check passed with removal/undo and hidden-outline assertions. Released from `7092d16` through deployment `79a9243a-3872-4571-acc0-deaa0433d54f` at https://precious-fish-294.convex.site/. All 13 live browser checks passed in 3.1 minutes, including visibility decisions, reappearance confirmation, edit invalidation, undo, hidden outlines, linked-action visibility export, workspace isolation and existing annotation flows. Live phone (390 pixels) and laptop screenshots inspected (`test-results/visibility-phone.png`, `test-results/visibility-laptop.png`).

Remaining: real footage disappearance/lookalike benchmarks, total peak memory, internet cold downloads, weaker-laptop evidence, model suggestion review, and continuous track export. Automated tracking is still unavailable. Real microphone input was not tested in this slice.
