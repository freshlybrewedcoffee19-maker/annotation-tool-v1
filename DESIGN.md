# Design System: Cheddar Vox

## Current authority — checked 12 October 2026

This document uses the approved yellow, orange, blue and navy identity. Historical red/brown identity and gradient buttons have been removed. The current annotation layout replaces the earlier video-between-two-sidebars arrangement. Trial and signed-in workspaces have distinct structures below.

## Palette

| Role | Colour |
|---|---|
| Primary actions and brand accents | Cheddar Yellow #FFB82E |
| Primary hover and depth | Cheddar Orange #F59E0B |
| Voice, interaction and focus | Vox Blue #2563EB |
| Main text | Deep Navy #172033 |
| Secondary surfaces and borders | Soft Blue #DBEAFE |
| Page background | Warm White #FFFDF8 |
| Cards and fields | White #FFFFFF |

Review statuses always include written labels. The current general review styling uses blue for Verify and soft blue/navy for verified status; error and disqualified styling remain distinct. Activity-specific green is reserved for review navigation and completion feedback.

## Typography and controls

Keep Segoe UI with a sans-serif fallback. Give the current question or footage decision the strongest heading. Keep supporting details quieter. Opening primary actions use yellow with navy text and orange borders; secondary actions use soft blue with blue borders. Account form primary actions use blue with white text. Preserve rounded controls, visible keyboard focus, written errors and reduced-motion support. Dense tables scroll horizontally.

## Opening page

The current landing page uses the headline Your voice. Your annotations. and an animated illustration showing a person switching from mouse clicks to voice annotation. Primary choices are Try a sample video and Use my own video. The older footage-card fan no longer describes the current landing page.

## Account entry

Returning users see Welcome back, Google sign-in, email and password together. Create account opens Google or email choices. Email signup has three screens: email, name with collapsed optional phone, then password. Back preserves answers; switching account flow clears the password. Focus moves to the first input when the stage changes. Provider availability controls Google and recovery options. Email verification and password recovery have dedicated screens when enabled.

Use a centred column capped at 510px, warm-white background, Segoe UI and blue primary form actions. Signup progress combines written counts and blue/soft-blue bars. Privacy and terms links stay beneath controls. Errors use written alerts; busy actions and fields are disabled.

## Verification scope

The live sign-in form and signup screens through password entry were checked on 12 October 2026, without creating an account. The live guest trial was opened, its desktop layout visually checked, and its controls inspected, including the More tools route to sign-in. Signed-in layout was compared with source code; signed-in actions, model results and phone layouts were not tested in this pass.

## Current annotation workspace — 12 October 2026

### Guest trial

Header shows the corgi brand and an editable sample filename. A slim top row holds Try annotation, expandable help and the blue microphone control. The left area has a narrow icon rail for Annotation and locked More tools, beside a panel of six editable saved labels. More tools routes to sign-in. The panel can collapse to a narrow rail.

The main canvas holds the full sample footage, with centred playback beneath it: jump back 10 or 5 seconds, play/pause and jump forward 5 or 10 seconds. Undo/Redo, exact time entry with Go, and a 24 fps readout support precise navigation. The sample is rotated 90 degrees in its container and fitted without cropping; this rotation is specific to this sample.

Saved annotations are represented below footage in three timeline lanes: Labels, Overlaps and Coverage. A shared time scale and written coverage percentage/overlap count accompany the lanes. The old right-side saved-annotation column is hidden. Guest practice stays separate from the account.

Source measurements: the expanded trial has a 190px tools column plus flexible canvas, or 58px when collapsed. Below 700px, the expanded tools column is 176px and playback wraps. Canvas height is clamp(280px, 48vh, 540px). These measurements describe the current stylesheet; narrow-screen usability has not been checked in this pass.

### Signed-in editor — source-checked

A slim labelled icon rail sits at the far left: Annotation, Outlines, Visibility, Relations, Masks, Tracking, Review and Export. Next is a collapsible panel showing only the selected activity's controls. Footage and playback occupy the remaining area, with the annotation timeline below. The microphone sits in the top guide row for action annotation; it is no longer a dedicated right sidebar.

The desktop grid is 62px rail / 220px controls / flexible footage. At 850px and below the rail and controls become 58px / 176px. Collapsing controls keeps the rail and expands footage. This layout is connected to the signed-in editor in ObjectBoxes.tsx; WorkspacePreview.tsx is a sample-only preview and does not prove signed-in saving or permissions.

### Surface, type and shapes

Use white headers and soft grey working surfaces: #F8F9FB for tools, #E9ECF1 behind footage and #F6F7F9 behind tracks. Dividers use #D5DAE2/#E1E5EB. Main text remains navy #172033; muted controls use #596477. Blue #2563EB marks microphone and selected tools. The signed-in rail's selected tool uses #E8EFFF.

The shell is square and compact. Signed-in headings use 14px, secondary headings 12px and ordinary controls/copy 11px Segoe UI. Label inputs are 32px high. Most controls have 3–5px corners; the main play button is a white 38px circle with a soft shadow. Timeline segments use pale blue #DCE7F8, border #B9C9E4 and 3px corners. Coverage uses green #BBD4C6, with striped gaps. Written lane names and counts explain the colours.

### Feature status and guidance

Pixel masks and assisted tracking have active signed-in destinations; object detection and team review remain Pending in the older activity navigation. Video masks remain pending. Active controls do not establish model accuracy or performance. Preserve manual boxes, polygons, visibility, action-object links, edit/undo and recoverable review decisions.

### Contextual tasks and progress

One microtask appears at a time, with completed-count text, Show me where, Skip task and Work independently. The target receives a 2px Vox Blue outline offset by 4px. Task-strip padding is 16px 18px, desktop minimum height 112px, heading 17px, help 12px with 1.6 line height and a 65ch maximum; phone heading is 16px and padding 14px. Trial guide preference is remembered in browser storage. Signed-in non-trial users also save and load the preference through their account; if sync fails, keep the local choice and show a retry message. Restart clears skipped steps, not saved annotations.

Progress reads actual labels, saved segments, saved object outlines, visibility records, links and review decisions, plus microphone/start/stop and export events. Turning on the mic and marking boundaries are preparatory steps; the action-save reward requires a saved segment. Skipping does not mark a task complete. Saved work and review transitions can show a brief written reward with a check icon and status announcement; existing records contribute to counts without replaying an initial reward. The reward uses task-reward green, a 350ms entrance with cubic-bezier(.16,1,.3,1), and clears after 4.5 seconds. Reduced-motion mode removes this entrance animation. Do not imply that this mode also removes the guide's explicitly smooth Show me where scroll.

### Scoped guardrails

Do retain written tool names, explicit pending states, precise source-proportion footage, recoverable annotations and existing edit/undo behavior. Do keep rewards connected to actual completion state or saved work. Don't use skipped tasks, hypothetical AI output or elapsed time as evidence that an annotation was saved. Don't present pending detection, video masks or team-review workflow as working tools, or imply that active model tools have verified accuracy. Review keeps swipe right to verify, swipe left to disqualify, and the existing Edit and Undo actions.

## Services sample
Keep the original dataset section: copy and pilot link on the left, compact portrait 400:540 video with timed annotation overlay and segmented playhead on the right. Phones stack copy over footage. Blue/white overlays and an orange playhead follow the brand palette. Preserve verified pilot copy and statistics.
