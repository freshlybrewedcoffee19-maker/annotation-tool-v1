# Cheddar Vox

## Platform
Web, with a laptop-first annotation workspace and responsive phone layout.

## Purpose
Voice led video annotation: upload footage or open a ready-made trial, mark labelled time segments, review them and export the result.

## Approved flow
Opening page has Annotate your own videos and Trial video annotation. Trial opens the existing 45-second dataset clip directly in Annotate. Own videos opens guided questions for reusable labels, metadata fields and metadata values. Each question has Skip; Skip to annotation bypasses the remaining questions. Saved settings apply to future uploads and can be changed per video. Setup ends in the dashboard. Video is central with labels and microphone nearby. Review presents short segment cards with Verify, Disqualify and Edit. Disqualified records remain recoverable and are excluded from exports.

## Constraints
Preserve existing private browser workspaces, original footage and annotations. GitHub stores code; Convex stores all app data and hosts the app. No login added. Deploy only through npm run deploy. Use the approved Cheddar Vox yellow, orange, blue, navy, warm-white and white palette; references are Relay for opening composition and onboarding and Build Sprint for rounded buttons.

## Open decisions
Specific user roles and pricing are unspecified. No claims about speed, accuracy or customers are approved.

## Approved expansion constraints
Expand video annotation first; defer 3D point clouds and supplying human labellers. Vision processing must run locally in laptop browsers with no rented inference machine or required desktop installation. Labels follow persistent object identities. Detected tracking uncertainty must stop accepted tracking and mark Needs checking; the user can reconnect a reappearing object and correct its box before continuing. Model choice and performance remain untested. The phased plan and candidate-model research are in BUILD_PLAN.md.
