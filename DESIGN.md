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

The main homepage (updated 15 October 2026) keeps the headline Your voice. Your annotations. and the choices Try a sample video and Use my own video. Its logo is the text-only Cheddar Vox wordmark with a blue underline. The supplied Launch Video.mp4 replaces the older animated illustration: preserve its complete 9:16 frame, H.264/AAC audio and 34-second duration. It starts muted, with native playback, sound and fullscreen controls; reduced-motion preference starts it paused. Use its extracted first-frame poster while loading.

The homepage fills the available viewport with a natural-height header, flexible main area and compact footer. Wide windows put the headline/actions beside the portrait video; portrait windows stack headline, video and actions. Video height takes the remaining space rather than imposing a fixed media height. Keep both main buttons, contact email, LinkedIn, dataset services and legal/version links visible on normal phone, tablet and desktop sizes. Never crop the video, scale the page or disable browser zoom. Exceptionally short windows may scroll to keep controls reachable. These rules are scoped to .home-page; annotation workspaces and Video Feedback retain their existing behavior and styles.

## Account entry

Returning users see Welcome back, Google sign-in, email and password together. Create account opens Google or email choices. Email signup has three screens: email, name with collapsed optional phone, then password. Back preserves answers; switching account flow clears the password. Focus moves to the first input when the stage changes. Provider availability controls Google and recovery options. Email verification and password recovery have dedicated screens when enabled.

Use a centred column capped at 510px, warm-white background, Segoe UI and blue primary form actions. Signup progress combines written counts and blue/soft-blue bars. Privacy and terms links stay beneath controls. Errors use written alerts; busy actions and fields are disabled.

## Verification scope

The live sign-in form and signup screens through password entry were checked on 12 October 2026, without creating an account. The live guest trial was opened, its desktop layout visually checked, and its controls inspected, including the More tools route to sign-in. Signed-in layout was compared with source code; signed-in actions and model results were not tested in this pass. The guest trial was also visually checked at 390 × 844 with tools expanded and collapsed.

## Current annotation workspace — 12 October 2026

### Guest trial

Header shows the corgi brand and an editable sample filename. A slim top row holds Try annotation, expandable help and the blue microphone control. The left area has a narrow icon rail for Annotation and locked More tools, beside a panel of six editable saved labels. More tools routes to sign-in. The panel can collapse to a narrow rail.

The main canvas holds the full sample footage, with centred playback beneath it: jump back 10 or 5 seconds, play/pause and jump forward 5 or 10 seconds. Undo/Redo, exact time entry with Go, and a 24 fps readout support precise navigation. The sample is rotated 90 degrees in its container and fitted without cropping; this rotation is specific to this sample.

Saved annotations are represented below footage in three timeline lanes: Labels, Overlaps and Coverage. A shared time scale and written coverage percentage/overlap count accompany the lanes. The old right-side saved-annotation column is hidden. Guest practice stays separate from the account.

Source measurements: the expanded trial has a 190px tools column plus flexible canvas, or 58px when collapsed. Below 700px, the expanded tools column is 176px and playback wraps. Canvas height is clamp(280px, 48vh, 540px). At the checked 390px width, expanded labels leave a narrow canvas: playback wraps across several rows and timeline timestamps crowd together. Collapsing labels retains the icon rail and gives the video and timeline substantially more room. This is an observed limitation, not a completed phone-layout fix.

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

## Cheddar Vox — Video Feedback: approved direction, 14 October 2026

### Scope and status
This section records the approved marketing design direction, not a claim that these screens have been implemented or tested. Refer to this experience as **Video Feedback** and the existing product as **Data Annotation**. Video Feedback has a separate homepage, navigation and workspace while reusing underlying annotation capabilities. All existing Data Annotation design rules, routes, behaviour and saved data remain unchanged.

This approval replaces the proposed cream-and-olive marketing direction. Existing Cheddar Vox wordmark and dog mascot remain recognisable; marketing gains its own dark visual language. Its logo always returns to the Video Feedback homepage. Sign-in, sign-out, sample, upload, card, review, recovery and back navigation must stay within marketing. Never route marketing visitors into Data Annotation implicitly.

### Visual point of view
Black and charcoal tactile keyboard keys reveal miniature worlds inside them. Use sculpted edges, worn matte textures, believable depth and selective interior lighting, inspired by the supplied cutaway-key reference. The reference forest establishes depth, texture and lighting; actual miniature scenes must communicate video feedback rather than introduce unrelated forest or gaming imagery.

Use pink and fuchsia as selective action, active-state and lighting accents, with warm-white readable text. Suggested implementation tokens (validate contrast in the rendered interface): background #0B0B0F, surface #18181E, raised key #25252D, main text #F7F4F0, secondary text #B9B5C2, pink #F3A6C8, fuchsia #D83C91. Use dark text on bright pink action surfaces. Do not use pink as the only indicator of status. Keep atmospheric scene lighting separate from functional text and control surfaces.

Important actions use raised keyboard-key controls with a subtle press response. Use plain readable feedback lists and restrained working surfaces; do not turn every element into a sculpted box. Homepage imagery can be immersive, but the working player remains calm and usable. Never introduce page-wide scaling or unexpected layout changes between screens.

### Message and homepage composition
Primary benefit: users do not have to write timestamps manually.

Headline: “Give video feedback. Skip writing timestamps.”
Supporting copy: “Say ‘start,’ ‘stop,’ then your feedback. Cheddar Vox records the timestamps and saves your comment with the exact clip—so your editor can jump straight to what needs changing.”

Compose the homepage as a connected explanatory flow with miniature key scenes and drawn arrows:
“Something needs changing?” → “Don’t write down the timestamp.” → Start / Stop / Say the change → “Your editor gets the exact clip.”

Integrate Try a sample into the demonstration and Upload your video into the end of the flow. Own-video entry invokes marketing sign-in if needed. Use an Enter key opening like a doorway as the transition into the tool, with a short or static reduced-motion alternative. No mandatory decorative delay.

A short explainer demonstrates real automatic timestamp marking, spoken feedback with editable text, and an editor reviewing the exact segment. Keep feedback history for year-end reporting as a supporting benefit, without invented performance claims.

### Loading and motion
During genuine loading on a slow connection, letter keys pop into place in shuffled order to form feel-good words such as CREATE, NICE and READY. The assembled word must be readable. Keep movement gentle; avoid rapid flashing and excessive continuous activity. Loading state must reflect actual readiness, never fake percentage progress. Do not show this treatment on every ordinary transition or delay a ready page to finish it. Provide a static loading label for reduced motion and accessible status text. Load the lightweight fallback before heavy artwork so it can appear on a slow connection.

### Screen sequence
1. Arrival and upload: welcoming keyboard composition, a prominent Upload video key, and access to existing cards for returning users.
2. Feedback: video and microphone are the main elements. Key-shaped Start, Stop and Save feedback actions supplement voice commands. Clearly show current instructions, listening, recording, transcription, saving and errors. Keep the entire source video visible with stable proportions and responsive controls.
3. Review: a Review clips key opens short marked segments with feedback text, original audio, version identity and context playback. Keep the same layout scale and visual identity.
4. Share and export: Share review, Prepare email, Word and Excel actions. Prepare email creates an editable ready-to-share draft; do not send automatically. File exports and links respect card permissions and revocation.

The existing marketing board and card/revision structure remain part of this journey. Integrate the design into those screens; do not replace the board or discard approved access, versioning and finalisation behaviour.

### Sign-in popup
Use a compact dark modal within the marketing experience, with Continue with Google and Continue with email. Email entry advances one question per horizontal slide. Back preserves answers; returning users receive the shorter login flow. Closing the popup preserves the underlying marketing location. Use focus containment, keyboard dismissal and return focus to the opening control. Preserve existing authentication security and provider behaviour. On small screens keep all fields and errors reachable without clipping.

### Interaction and accessibility
Key-shaped controls work by click/tap and keyboard focus. Show shortcut legends only when those shortcuts are actually implemented. Decorative letter keys must not look like unavailable controls. Keep visible focus, readable contrast, sufficient touch areas and text labels for icons. Reduced motion removes scene travel, key popping and sliding while preserving meaning and navigation.

The transcription indicator appears only while feedback speech is being processed, not whenever the mic is on. Standalone start during feedback must preserve/queue the previous comment and resume playback for the next marked segment without waiting for network saving. The visual redesign must not regress this flow.

### Implementation and review boundaries
Scope marketing tokens and styles to its own application shell, not global Data Annotation selectors. Reuse existing capabilities through explicit marketing configuration. Preview desktop and mobile, landscape and portrait footage, slow loading, sign-in steps, card entry, feedback, review and exports. Confirm stable video proportions, consistent control sizes and marketing-only navigation. Generate final scene assets against this direction and inspect them at actual display size. Do not publish the redesign without owner approval of the working preview.

### Project workspace on phones — 14 October 2026
Each project contains one video and its revisions. Keep the video inside a raised keyboard key, with its title, latest version and four stages attached below. Highlight the current stage with both text and a filled marker. Stages are Give feedback, Share with editor, Revised and Approved.

At phone widths, use one full-width project per row, readable 14px stage labels and 18px project titles. Returning users see the upload action and existing projects first; the introductory explanation is reserved for the empty workspace. Keep the keyboard-key shape and black/pink palette. Secondary navigation opens from a 44px Menu control; closing it or navigating restores an uncluttered page.

Project lists allow normal vertical scrolling. The tool inside a project follows the single-screen layout below.

### Single-screen Video Feedback tool — 14 October 2026
Keep the working tool within the available screen height, on phones and desktop. The main view has no side panels or page scrolling: a compact project title, the full video, playback, a raised microphone key, and a horizontal strip of saved feedback keys. Preserve the complete video frame with contain sizing for both portrait and landscape footage. Do not scale the whole page or crop footage to fill the space.

The pink microphone key shows a mic icon and **On** to enable it, then **Off** while listening. A short status beside it explains whether the mic is off, listening, marking a clip, recording feedback or saving. Instructions follow the current step: turn on the mic, say start, say stop, speak the change, then say start again or save. Keep the existing speech-command sequence, original voice recording, editable transcript and recoverable queued saves. Do not show separate Write feedback or Read feedback links. Edit draft appears only when there is an unsaved draft; errors and failed saves retain a manual recovery form.

Each saved feedback key shows its start/end time, version number, a short text preview and resolved/play state. Swipe or scroll this strip sideways; the surrounding page stays fixed. Selecting a key plays its matching video version from the recorded start to the recorded stop. A separate Edit button on the key opens its comment and start/stop fields directly. Preserve the original voice recording when correcting text or timing; reject reversed or out-of-video ranges. View-only visitors see Details instead of Edit. A new spoken start clears any previous playback clip boundary.

Download feedback replaces More and opens Download Excel, Download Word, Copy text and the owner's editor-email invitation form. Exports use the version already selected in the tool, with no second version dropdown. Copy text copies that version's saved comments and timestamps, shows a selectable text preview, and confirms when copying succeeds; if clipboard access fails, the text remains available for manual copying. Versions, project stage, revision upload, existing sharing controls and finalisation remain in Project settings. Creating an invitation prepares an email draft and a copyable private link; the user sends the draft. Do not claim automatic email delivery. Secret-link acceptance requires signed-in matching email, an active unexpired grant and the private invitation token; it does not require the removed signup verification step. Tokenless legacy acceptance remains separately protected.

Guide the next action with one pink highlight at a time: microphone, current spoken command, save, latest feedback clip, then download. Pulse gently three times on step changes, then retain the highlight. Never blink the whole interface or pulse every button simultaneously. Background saves do not interrupt guidance for a newly marked clip. Reduced-motion mode keeps a static highlight.

These secondary dialogs can scroll internally on short screens and provide a labelled close button, contained keyboard focus and Escape dismissal. They preserve the same permissions and pending-save guards. Inputs remain 16px to avoid phone focus zoom; primary controls use 44px touch targets.

At short landscape sizes, put the video and playback on the left and the mic and horizontally scrolling feedback strip on the right. The desktop layout keeps the same single-screen hierarchy. Scope all of these changes to Video Feedback; Data Annotation retains its existing layout.

### Desktop, voice reliability and storage — 14 October 2026

The homepage responds to both the available width and height. Use a connected horizontal problem → spoken solution flow in wide windows (at least 760px and as wide as they are tall); use the vertical flow on portrait screens. Let the header take its natural height and give the flow the remaining space. Size artwork, headings, command keys and actions relative to their container, with proportional margins and an image crop that keeps its aspect ratio. Do not cap the whole desktop flow or image at fixed pixel dimensions. Height constrains ultrawide growth; smaller portrait screens reduce the artwork first. Keep controls at least 44px high, preserve readable text and allow natural scrolling at extreme short heights or enlarged text rather than clipping. Never counteract browser zoom with CSS zoom or scale transforms. The workspace uses the available desktop width. On tall desktop tool screens, the video sits above one bottom row containing the mic and the horizontally scrolling feedback keys. Normal phone and desktop views fit one screen.

Apply that responsive behaviour throughout Video Feedback: workspace, upload and empty states, project cards, private/sample tools, shared reviews, invitations, unavailable links, sign-in steps and every popup. Share a readable body scale based on both window dimensions, with proportional controls and margins. Project cards form as many natural columns as the available width supports; keep one project card at a sensible column width, wrap long titles, and allow the project list to scroll vertically. Collapse navigation before its labels become crowded. The player uses the full available width and remaining height, with video proportions preserved. Feedback keys scroll horizontally without expanding the page.

Size sign-in, download/copy text, editor invitation, feedback editing, project settings and storage dialogs by their content and available window. Keep them inside the visible viewport, including when its height changes for a phone keyboard; use internal scrolling for longer forms. Wrap action rows and timing fields, keep inputs at least 16px and controls at least 44px, and retain labelled close buttons and visible focus. The inactive homepage behind sign-in must retain its full layout width. These rules are scoped to the marketing flow and do not change Data Annotation or voice, account, export, sharing or storage behaviour.

Only show Listening after the browser speech service confirms it is ready. Show Connecting, Reconnecting or an actionable failure as appropriate. Preserve audio and text on failure. A next start/play/resume command queues the previous comment and plays the next segment; playback failures must be visible. Transcribing animates only while interim feedback text is arriving, with a static reduced-motion alternative.

Free storage is 1 GB per account, shared across owned annotation files, feedback videos, revisions and voice recordings. Invited editors use the project owner's allowance. Include unfinished-upload reservations in the server check. The storage popup shows usage, required space, the free allowance and the confirmed customer price of USD $0.020 per extra GB per month. Signed-in owners can choose Request more storage. Explain before clicking that their name, account email and usage will be emailed to riya.shah@cheddarvox.com. The backend derives the identity and usage, saves the request, sends it through the existing email service and makes replies go to the requesting account. Show sending, sent or retry feedback truthfully, suppress duplicate requests for 24 hours and keep saved work available. Automatic charging and paid storage activation are not connected; requesting storage does not activate a paid plan. Never remove saved work to enforce the limit.
