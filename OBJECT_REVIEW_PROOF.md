# Object box review and spatial export

5 October 2026. Implementation checkpoint: `867f4b2`.

The annotation workspace now contains **Review object boxes & export** below the video. Each saved box can be verified, disqualified or restored to pending. Selecting its name pauses and seeks to its saved time. Decisions save in Convex and persist after refresh. Disqualification keeps the box and its object identity; only the new object JSON export excludes it. Existing time-segment exports remain unchanged.

The new export identifies its format/version, episode, normalized-video coordinates, object identity, saved time, box geometry, manual source and review status. Pending boxes are included with their status; this is not a verified-only dataset. No tracking, interpolation or model-generated annotations are introduced by this release.

Geometry changes reset review to pending on the server. Ordinary unchanged saves preserve the server's current review decision, even if the client has an older status. Review reads and writes use the existing private workspace ownership check. Schema fields are optional so existing saved boxes need no migration.

Before publishing: build passed and three browser checks passed against the local interface and the existing Convex backend. They covered box editing, save/refresh, object identity, disqualification/export exclusion/recovery, review ownership, geometry reset, reusable setup and existing segment review. After publishing, all 10 existing browser checks passed on the live website (2.2 minutes), including the expanded object review/export flow, returning-visitor opening page, uploads, segment review, privacy, labels and existing exports. Laptop and phone screenshots were inspected and the phone overflow check passed. Speech checks inject recognition results; they are not a real microphone test.

Remaining: polygons, polygon export, richer spatial review and revision history, object-linked action intervals, and model gates in the approved plan. This release does not complete those phases.
