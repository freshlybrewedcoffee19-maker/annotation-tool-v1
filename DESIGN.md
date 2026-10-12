# Design System: Cheddar Vox

## Current authority — checked 12 October 2026

This document uses the approved yellow, orange, blue and navy identity. Historical red/brown identity, gradient buttons and two-column annotation layout have been removed. The scoped workspace sections below describe the established three-pane foundation; trial-specific changes are noted separately.

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

Use real footage and the approved Relay-inspired composition. Desktop has five portrait footage cards. Below 768px, the cards form an animated arc with a central readable card and adjacent cards; reduced-motion mode shows one static central card. Do not apply the footage fan to data cards or other screens.

## Account entry

Returning users see Welcome back, Google sign-in, email and password together. Create account opens Google or email choices. Email signup has three screens: email, name with collapsed optional phone, then password. Back preserves answers; switching account flow clears the password. Focus moves to the first input when the stage changes. Provider availability controls Google and recovery options. Email verification and password recovery have dedicated screens when enabled.

Use a centred column capped at 510px, warm-white background, Segoe UI and blue primary form actions. Signup progress combines written counts and blue/soft-blue bars. Privacy and terms links stay beneath controls. Errors use written alerts; busy actions and fields are disabled.

## Verification scope

The live sign-in form and signup screens through password entry were checked on 12 October 2026, without creating an account. Workspace descriptions were compared with source code; their visual appearance and model results were not browser-tested in this documentation pass. The trial has additional layout overrides in src/trial-layout.css and a tool rail, so the three-pane foundation below is not an exact description of every trial screen.

## Annotation workspace layout — 6 October 2026

This scoped workspace extension follows the user-approved three-pane reference while retaining the approved Cheddar Vox palette, Segoe UI, existing annotation functions and guided setup. It applies to the Annotate stage only; the opening, setup and review layouts keep their existing treatment.

The editor shell is capped at 1800px with 18px 24px outer padding. Its desktop grid is 300px / flexible footage / 260px, with object drawing tools plus Your labels, Label by hand, Object visibility & reappearance, and Review object boxes & export on the left; playback and video above the timeline in the centre; and microphone controls, its two modes, command guidance and saved-label hints on the right. Pending features remain below the left-side controls. Both side panes scroll within a maximum height of calc(100vh - 200px), with a 520px minimum height. Video is contained without cropping in a clamp(320px, 48vh, 560px) height. The timeline has an internal 150px scrolling limit.

At 1600px and above, side panes become 310px and 280px. Between 801px and 1100px, they become 260px and 240px, outer padding becomes 16px and playback wraps its time readout. At 800px and below, outer padding becomes 14px and the panes stack in this order: footage, timeline, inspector, object tools. Side-pane height limits are removed; video returns to a 16:9 frame with a 210px minimum and 430px maximum height. The tool buttons wrap.

Compact editor type is local to this surface: 24px brand, 16px file, secondary-tool and inspector headings, 14px tool and timeline headings, 13px workflow buttons and secondary-tool disclosure labels, 12px controls and body copy, and 11px help, timestamps and timeline notes. The microphone action is 17px with a 54px minimum height. Pending badges use 10px on desktop and 11px on phones; phone playback time uses 10px. Preserve the incumbent Segoe UI family rather than introducing a new identity.

The editor grid has 12px corners, reduced to 8px on phones. Playback, tool and mode buttons and compact fieldsets use 6px corners; microphone and mode-group containers use 8px, and Pending badges use 4px. Playback buttons are 32px square on desktop and 28px wide by 32px high on phones. White panes, warm-white tools, soft-blue dividers and navy footage backing organise the work without new shadows. The review action uses Cheddar Yellow with an orange border; microphone and focus use Vox Blue. Selected tool controls use Soft Blue with a blue border. Editor keyboard focus is a 3px blue outline with a 2px offset.

Object detection and team review remain Pending in activity navigation. Pixel masks and assisted tracking have active tool destinations; video masks remain pending. An active destination does not establish model accuracy or performance. Existing manual boxes, polygons, visibility, voice annotation and trial tracking review remain available. Playback frame steps are explicitly estimated from a supplied frame rate, with a 0.1-second fallback. Native video controls remain available. No raster assets or model capabilities are introduced by this layout.

## Guided workspace extension — 6 October 2026

This user-approved extension supersedes the earlier annotation tool arrangement for the guided workspace and review/export destination. Preserve the services sample and unrelated incumbent surfaces. CVAT precision, Canva feature discovery and Candy Crush microtasks guide the interaction; their visual skins are not copied. The approved Cheddar Yellow, Cheddar Orange, Vox Blue, Deep Navy, Soft Blue, Warm White and White primitives above remain the brand palette. Activity tones distinguish destinations rather than replacing that identity.

### Layout and shapes

The existing three-pane editor keeps named, coloured activity destinations on the left, footage and timeline central, and microphone controls on the right. Only the selected activity's relevant manual tools appear. A contextual task strip sits above footage. Video uses contain fitting, centred in its host, and a minimum height of zero in this extension: original footage proportions remain visible without cropping; drawing geometry follows the displayed image bounds. The existing editor breakpoints remain; at 800px and below navigation becomes two columns and task actions wrap below the prompt.

Review/export uses a 260px / flexible content / 260px grid with an 18px gap: navigation left, task and review content central, microphone right. At 1100px and below the grid becomes 220px / flexible content and microphone moves into the content column; at 800px and below it becomes a vertical flow. Activity buttons have 8px corners, 9px 10px padding, 12px labels and a 42px minimum height (44px on phones). Selected destinations use their coloured border plus an inset 1px outline and 700 weight. Numbered symbols use white 22px squares with 5px corners. Export task and microphone containers use 12px corners. No new drop shadows are added.

### Activity navigation

Action labels use Vox Blue / Soft Blue; Objects & outlines and pending Object detection use activity orange / orange surface; Visibility & reappearance and Assisted tracking use teal / teal surface; Actions & objects use yellow / yellow surface; Review uses green / green surface; Export and pending Team review use Deep Navy / navy surface; Pixel masks use purple / purple surface. Activity text/surface pairs are orange #B45309/#FFF0D4, teal #087F8C/#DDF4F2, yellow #946000/#FFF4BF, green #2E6B45/#E4F2E8 and purple #7040AD/#F0E8FA. Navy surfaces use #E9EDF4; task rewards use #235537. Every destination has a written name, and the active button exposes its pressed state. Object detection and team review stay inside Coming next with explicit Pending badges. Pixel masks and assisted tracking are available activity destinations with their own tools and guided tasks; video masks remain pending.

### Contextual tasks and progress

One microtask appears at a time, with completed-count text, Show me where, Skip task and Work independently. The target receives a 2px Vox Blue outline offset by 4px. Task-strip padding is 16px 18px, desktop minimum height 112px, heading 17px, help 12px with 1.6 line height and a 65ch maximum; phone heading is 16px and padding 14px. Trial guide preference is remembered in browser storage. Signed-in non-trial users also save and load the preference through their account; if sync fails, keep the local choice and show a retry message. Restart clears skipped steps, not saved annotations.

Progress reads actual labels, saved segments, saved object outlines, visibility records, links and review decisions, plus microphone/start/stop and export events. Turning on the mic and marking boundaries are preparatory steps; the action-save reward requires a saved segment. Skipping does not mark a task complete. Saved work and review transitions can show a brief written reward with a check icon and status announcement; existing records contribute to counts without replaying an initial reward. The reward uses task-reward green, a 350ms entrance with cubic-bezier(.16,1,.3,1), and clears after 4.5 seconds. Reduced-motion mode removes this entrance animation. Do not imply that this mode also removes the guide's explicitly smooth Show me where scroll.

### Scoped guardrails

Do retain written tool names, explicit pending states, precise source-proportion footage, recoverable annotations and existing edit/undo behavior. Do keep rewards connected to actual completion state or saved work. Don't use skipped tasks, hypothetical AI output or elapsed time as evidence that an annotation was saved. Don't present pending detection, video masks or team-review workflow as working tools, or imply that active model tools have verified accuracy. Review keeps swipe right to verify, swipe left to disqualify, and the existing Edit and Undo actions.

## Services sample
Keep the original dataset section: copy and pilot link on the left, compact portrait 400:540 video with timed annotation overlay and segmented playhead on the right. Phones stack copy over footage. Blue/white overlays and an orange playhead follow the brand palette. Preserve verified pilot copy and statistics.
