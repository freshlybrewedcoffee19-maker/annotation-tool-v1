---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: ["src/ObjectBoxes.tsx","src/editor-layout.css","src/EditorPlayback.tsx","src/PendingFeatures.tsx"]
---

# Annotation workspace
Mode: Operate. Scope: /workspace annotation layout after guided setup; preserve existing setup, storage, geometry, voice and review behavior.

## Direction contract
THESIS: Keep video, tools and decisions adjacent instead of a long vertical stack. User supplied the CVAT screenshot as the structural reference.
OWN-WORLD: Cheddar Vox yellow primary review action, blue microphone and selection, navy text, white panes, warm-white canvas; Segoe UI and compact readable controls.
STORY: Choose or upload footage after guided questions, draw named objects, label actions or visibility by voice, inspect boundaries on a timeline, then review and export saved work.
FIRST VIEWPORT: Compact header and workflow navigation. Left 300px tool rail contains object drawing, Your labels, Label by hand, Object visibility & reappearance, and Review object boxes & export; central video has playback toolbar and timeline; right 260px pane contains only voice labelling, microphone modes, command guidance and saved-label hints. At 1600px and above side panes become 310px / 280px; at 801–1100px they become 260px / 240px. At 800px and below panes stack footage, timeline, voice controls, then object and label tools. Pending features carry explicit Pending badges and descriptions. Phone panes stack without horizontal overflow.
FORM: User-pinned three-column editor; no concept seed needed for this specified structure. Native video controls remain available in signed-in workflows. The sample refinement below uses one custom toolbar without native-control duplication. Frame stepping is explicitly estimated. No new model capability is asserted.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Sample entry refinement — approved 6 October 2026

THESIS: Make the account-free sample the immediate entry, then foreground the first action-label task.
OWN-WORLD: Preserve DESIGN.md and .impeccable/design.json primitives, incumbent Segoe UI, Warm White canvas, Deep Navy copy, rounded media and controls, and Vox Blue voice/selection. The home sample action uses the existing Cheddar Orange; this is a scoped action treatment, not a new palette.
STORY: Home promises “Label robotics videos as you speak.” → orange “Try a sample video” beside “No account needed” → immediate first-frame loading view → existing 45-second trial in Action labels. “Use my own video” remains secondary and opens the account/upload route. Loading includes progress, a 15-second failure path, Try again and Back to home.
FIRST VIEWPORT: Keep the incumbent shallow five-card footage fan on desktop, now with real sample frames in every card; phones show its central three cards. Preserve the typed brand, Sign in and Dataset services navigation. Trial opens with Action labels and collapsed More tools in the left rail, the contextual task and one playback toolbar above source-proportion footage, and microphone on the right. At 800px and below, trial order is footage/task/playback, microphone, tool rail, then timeline, making the microphone reachable before the timeline. Do not generalize this phone trial order to signed-in workflows.
FORM: Collapsed More tools retains the other incumbent destinations and manual controls. Written names and explicit Pending states remain. All buttons, links and summaries have a 44px minimum interaction height. Retain existing voice parser, annotation storage, exports, private signed-in workflows, recoverable review and geometry. Frontend deployment remains on the approved Cloudflare website, with Convex backend public pages redirecting to canonical frontend pages.
FINISH: Source checked against src/Landing.tsx, src/SignIn.tsx, src/SampleLoading.tsx, src/main.tsx, src/ObjectBoxes.tsx, src/EditorPlayback.tsx, src/AnnotationVideo.tsx, src/workspace.tsx and src/release-fixes.css. Visual evidence: outputs/release-home-1280x800.png, outputs/release-home-390x844.png, outputs/release-trial-1280x800.png and outputs/release-trial-390x844.png. These captures evidence the home and ready trial layouts; they do not independently prove loading timeout, authentication, voice recording, persistence or export behavior.

Not canonized: root DESIGN.md and the sidecar retain historical red/brown descriptions and an earlier progressive-returning-sign-in contract; their newer approved palette supersedes those descriptions. This narrow surface update preserves the incumbent token files rather than repairing historical drift.

Quality bar: screenshot's dominant footage, compact toolbar, adjacent tools and inspector; retain Cheddar Vox palette and voice interaction. No raster assets created. Pending: general assisted tracking, supported-category detection, masks and team review; existing trial track review and manual geometry remain available. 3D and staffing remain deferred.

## Guided workspace direction — approved 6 October
THESIS: One video workbench, distinct activity destinations, one contextual microtask instead of a checklist to memorise.
OWN-WORLD: Existing Cheddar Vox cream/white/navy, yellow and blue. Activity colours identify tools through both name and colour. CVAT precision, Canva discoverability and Candy Crush progress are interaction influences, not copied skins.
STORY: Home promise → account → own video upload → metadata → workbench → guided annotation → swipe review → export. Trial remains immediate and guest-friendly.
FIRST VIEWPORT: Central un-cropped footage and timeline; compact coloured activity navigation left; microphone right. One task strip above footage, with skip/restart and progress. Returning users can work independently.
FORM: User-pinned hybrid direction; preserve existing geometry, parser, undo, uncertainty and exports. Pending features have honest destinations and no simulated functionality.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
