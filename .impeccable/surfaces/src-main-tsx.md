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
FORM: User-pinned three-column editor; no concept seed needed for this specified structure. Native video controls remain available. Frame stepping is explicitly estimated. No new model capability is asserted.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Quality bar: screenshot's dominant footage, compact toolbar, adjacent tools and inspector; retain Cheddar Vox palette and voice interaction. No raster assets created. Pending: general assisted tracking, supported-category detection, masks and team review; existing trial track review and manual geometry remain available. 3D and staffing remain deferred.

## Guided workspace direction — approved 6 October
THESIS: One video workbench, distinct activity destinations, one contextual microtask instead of a checklist to memorise.
OWN-WORLD: Existing Cheddar Vox cream/white/navy, yellow and blue. Activity colours identify tools through both name and colour. CVAT precision, Canva discoverability and Candy Crush progress are interaction influences, not copied skins.
STORY: Home promise → account → own video upload → metadata → workbench → guided annotation → swipe review → export. Trial remains immediate and guest-friendly.
FIRST VIEWPORT: Central un-cropped footage and timeline; compact coloured activity navigation left; microphone right. One task strip above footage, with skip/restart and progress. Returning users can work independently.
FORM: User-pinned hybrid direction; preserve existing geometry, parser, undo, uncertainty and exports. Pending features have honest destinations and no simulated functionality.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
