# Cheddar Vox Version 2 — agreed product scope

Interview closed and scope confirmed by Riya on 2026-10-10.

## Person and purpose

Serve annotators completing tasks, including first-time users. Give annotation priority: upload media, choose labels, annotate, correct, review and export. Existing annotators have reported that V1 voice labelling works well. New voice-driven spatial tools still need testing with those users.

## Version boundary

- Preserve the existing product as Version 1, accessible through a Version 1 link while V2 is built and tested.
- Carry forward V1's existing voice workflow unchanged: mic controls, recording behaviour, spoken start/stop and timestamps matched to video playback. Inspect and reuse its actual behaviour; do not redesign it or introduce automatic listening.
- Also retain V1's review cards displaying the labelled annotation, with swipe left, swipe right and edit options.
- Other existing features remain under V1 even where they overlap. They are not automatically accepted as the V2 implementation.
- Remove V1 only later when V2 is ready and Riya decides to retire it. No automatic deletion or migration of existing projects.

## Build order

1. Complete the solo video workflow: upload, labels, annotation, correction, review and model-ready export.
2. Audio workflows next, then images. The whole feature list below remains the final scope.
3. Add team task assignment, collaboration, review controls and analytics after the solo workflow.

Offer a sample task and own-file upload. Show brief task instructions and a labelled example. Accept mixed image/video/audio uploads in a project and open the matching editor; clearly report upload failures and retries.

## Final feature list and agreed voice behaviour

| Feature | Agreed behaviour |
| --- | --- |
| Bounding boxes | Draw and speak a label, or say “box the red car” for an editable AI suggestion. |
| Polygons | “Outline the red car” proposes an outline; users adjust before accepting. |
| Brush | “Paint the road” proposes a filled region; mouse adds/erases. Support larger brush, erase and undo. |
| Skeletons | “Mark this person's pose” proposes connected joints. Drag corrections and mark hidden joints by voice. |
| 3D cuboids | Start with adjustable boxes on ordinary images/video. Do not imply accurate physical dimensions without camera measurements or depth data. |
| Tracking | Select a labelled object and request an end time, or use spoken start/stop during playback. Preserve the existing voice timestamp behaviour. Pause tracking on lost identity and ask for the object again. |
| Audio intervals | Start/stop mark a segment, followed by a spoken label. Allow draggable boundaries and keep command input distinct from source audio. |
| Custom AI integrations | Owner connects Hugging Face or other suitable model services; annotators use them without configuring credentials. Customer accounts fund external processing; disclose costs before use. |
| SAM segmentation | Propose editable pixel masks using Meta SAM where suitable. |
| Instance segmentation | “Select all cars” creates separately editable objects, not one combined mask. |
| Keypoints | Ready-made templates for first-time users. Custom project templates deferred to paid/enterprise offerings. |
| Classification | Classify whole image/video/audio items using suggested label lists users can edit. |
| Manual labels | Selected object receives its label; otherwise whole-item classification. Clarify ambiguous intent on screen and accept a spoken response. |
| Task management | Personal task list; teams assign batches. To do → In progress → Ready for review → Approved, with returned corrections. |
| Collaboration | One annotator edits a task at a time. Teammates comment; reviewers request changes. |
| Review quality control | Preserve swipe cards and edit. Team tasks require reviewer approval for final export; solo users may approve their own. Allow annotation-specific feedback such as “flag this box.” |
| Analytics | Completed tasks, time spent, label counts, review corrections; team owners see progress by annotator. |
| ML-ready export | Recommend a format based on training task. Also offer a full backup of labels and review history. Validate actual supported formats as each tool ships. |

## Interaction rules

- Tool names activate tools; direct requests also propose annotations. “Polygon” opens the tool; “outline the red car” requests an outline.
- Video spatial annotations start on the current frame. Tracking only starts when requested.
- Users must be able to adjust, delete or redraw boxes and masks before review. Accepting a suggestion never makes it uneditable.
- Show suggestions before “accept all”; individual correction and undo remain available.
- When multiple objects match, highlight candidates A/B/C and accept a letter by voice or click. Use a temporary frame grid when AI cannot locate the target, rather than a permanent grid.
- Clarify only uncertain intent/targets with on-screen questions and spoken answers. Otherwise show the result with undo.
- Failed object detection offers manual drawing and a retry using a click on the object.
- Every action has a manual alternative if speech fails. Show what was heard and preserve work.
- Keep unfinished edits on-device across tab closure or lost connection; upload when possible and distinguish device-saved from online-saved work. Resolve conflicting edits without silently overwriting them.
- Do not add application storage of raw voice recordings by default. Any intentional retention requires explicit choice. Inspect existing speech processing before changing it.
- UI layout remains open. Available tools must be discoverable on screen and activate when requested by voice.

## Business and technology constraints

- Build the tool before packaging plans. Free-tier feature access is undecided.
- Future usage-based plan: prepaid credits, topped up by customers, covering cloud, AI and GPU costs. Keep usage measurable; no billing system or paid processing activated in this scope step.
- Earlier discussion favoured free manual/voice annotation and customer-funded AI. Final entitlements remain undecided after Riya's pricing clarification.
- Keep Convex for database/backend/auth. Existing hosting stays in place; no hosting migration is part of this scope.
- Evaluate reusable open-source parts from CVAT and Label Studio, including component-specific licenses and required notices. Do not assume their complete servers or enterprise features can be dropped into this app.
- Explain the actual chosen technology in plain words after implementation: interface, voice, annotation engine, model processing, database, file storage, hosting and who pays for processing.

## Evidence and first inspection

- Existing voice implementation: `src/VoiceLabels.tsx`; it passes speech results with video `currentTime` to its command engine. `src/GuidedTasks.tsx` documents the current start/play, stop/pause, label/save flow.
- Existing card review: `src/ReviewDeck.tsx` and `src/TrackReview.tsx`. Review components include swipe and edit behaviours.
- Current interface uses React, TypeScript and Vite; backend/auth uses Convex. These are existing facts, not a finished V2 stack decision.
- CVAT's `cvat-canvas` package is an MIT-licensed TypeScript canvas library with SVG dependencies. Reuse candidate, not yet integrated or tested here.
- Label Studio's editor is a private workspace package with substantial dependencies. Its package declares MIT, while the repository root license is Apache 2.0; inspect exact files and notices before selecting any code.
- Sources: https://github.com/cvat-ai/cvat and https://github.com/HumanSignal/label-studio/.

## Next implementation gate

Inspect V1 voice and card review contracts, then test a small isolated video editor integration against a fixed upstream revision. Prove manual draw/edit, unchanged voice timing, card review and export before extending tool coverage. No application code changed or deployment performed during scope capture.
