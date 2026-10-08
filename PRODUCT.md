# Cheddar Vox

## Platform
Web, with a laptop-first annotation workspace and responsive phone layout.

## Purpose
Voice led video annotation: upload footage or open a ready-made trial, mark labelled time segments, review them and export the result.

## Approved flow
Opening page has Annotate your own videos and Trial video annotation. Trial opens the existing 45-second dataset clip directly in Annotate. Own videos opens sign-in, then video upload, then guided metadata fields, values/locks and action labels. Name/email and optional phone form a profile; Google sign-in is configured, owner-tested and its branding verified. Sign-in uses a method choice (Google or email), then one primary field per screen: email, name and password for signup; email and password for returning users. Optional phone stays collapsed on the name step; Back preserves answers. Each question has Skip; Skip to annotation bypasses the remaining questions. Saved settings apply to future uploads and can be changed per video. Setup ends in the dashboard. Video is central with labels and microphone nearby. Review presents short segment cards with Verify, Disqualify and Edit. Disqualified records remain recoverable and are excluded from exports.

## Constraints
Preserve existing private browser workspaces, original footage and annotations. GitHub stores code; Convex handles data, accounts and private uploads; Cloudflare Pages serves the canonical website and public trial. Deploy frontend with Wrangler, backend with Convex. Use the approved Cheddar Vox yellow, orange, blue, navy, warm-white and white palette; references are Relay for opening composition and onboarding and Build Sprint for rounded buttons.

## Open decisions
Specific user roles and pricing are unspecified. No claims about speed, accuracy or customers are approved.

## Approved expansion constraints
Expand video annotation first; defer 3D point clouds and supplying human labellers. The user replaced the browser-only vision restriction with cloud processing in October 2026; no required desktop installation. Labels follow persistent object identities. Detected tracking uncertainty must stop accepted tracking and mark Needs checking; the user can reconnect a reappearing object and correct its box before continuing. Cloud model choice and performance remain untested. The phased plan and candidate-model research are in BUILD_PLAN.md.

## Project workspace — approved 8 October 2026
Persistent sign-in routes homepage visits to a searchable project grid. Project cards show only name and thumbnail. Upload one or multiple videos into a project; default name is the first filename without extension, editable; thumbnail is the first video's first frame. Sidebar shows storage usage. Brand-coloured workspace cover guides metadata before labels, one question at a time, voice or typing, Back and Skip. Suggested metadata: Task, Objects, Environment, Camera view. Suggested labels require confirmation. Additional videos explicitly choose project settings or separate settings.

Invite signed-in teammates through + Collaborator after first annotation, not onboarding. Roles: Owner manages settings/invites, Annotator edits and may review own work, Reviewer reviews/corrects. One editor per video. Autosave edits, setup answers, navigation and playback position. Within 24 hours ask whether to continue last video; at 24 hours or more show video thumbnails without resume prompt. Closing browser requests processing cancellation, with honest delayed detection; reopening never restarts paid work automatically. AI tools run on explicit request only, results Needs review, failed jobs offer Try again and preserve saved work. Deleted projects/videos remain in Trash seven days; retain storage accounting until removal. These are approved target behaviours, not claims all are implemented.

## Guided workbench — approved 6 October 2026
Homepage positioning: label time segments in robotics videos by voice. Say start and stop during playback, then an action label. Export action labels with start/end times as CSV or JSON. The earlier “Talk to your dataset” promise is withdrawn (8 October feedback). The user-approved hybrid combines CVAT precision, Canva feature discovery and Candy Crush microtasks; it is not a copied game skin. Colour-coded tools left, original-proportion video/timeline central, microphone right. First-use contextual tasks highlight one next action, progress follows real UI states and saves, rewards follow saved work or review, and users may skip or work independently. Trial guide choices are remembered in the browser; signed-in users save their guide choice to their account. Exact voice commands navigate tools, control playback and review clips; no unconstrained conversational understanding is claimed. Pending feature destinations remain explicitly pending. Swipe right verifies, left disqualifies, Edit and Undo remain available. Disqualified work stays recoverable and is excluded from exports. Existing anonymous work is preserved; claiming it adds account access protection.

## Free-plan limits — approved 8 October 2026
Per account across projects: 1 GB uploaded video storage, 250 MB per video, five active projects. Manual/voice annotation has no artificial usage cap. Cloud AI processing disabled until a separate allowance is approved. At limits, block new uploads/new projects while keeping saved work readable, editable and exportable. Existing over-limit records are retained.
