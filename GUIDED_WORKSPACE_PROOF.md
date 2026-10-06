# Guided workspace release — 6 October 2026

## Delivered

- Homepage: “Talk to your dataset.” / “The annotation system does the clicking.”
- Own-video journey: real account sign-in, upload, metadata fields and locked values, action labels, annotation dashboard. Trial remains a guest journey.
- Profile includes name, email and optional phone. Phone is profile information, not SMS authentication.
- Account-owned workspaces and uploads require authentication. Existing guest work can be claimed without deleting records; trial work stays separate.
- Feature navigation uses distinct colour families and named destinations. Video keeps its source proportions in the centre; microphone remains on the right on desktop. Phone layout stacks without horizontal overflow.
- Contextual microtasks, next-action highlighting, skip and independent-work controls. Saved-work rewards follow actual stored clips, objects or review decisions. Mic and boundary milestones do not claim saved work.
- Guide choices persist locally for guests and in signed-in profiles across browsers.
- Exact spoken commands navigate available destinations, control playback, start drawing tools, and operate review. Drawing itself still uses the pointer. Commands are not open-ended conversation.
- Swipe review, Edit, Undo and recoverable disqualified records remain intact. Reappearance still requires a verified same-object outline and explicit confirmation.
- Detection, general assisted tracking, masks and team review are explicitly Pending.

## Local evidence

- TypeScript and production build passed.
- Real email signup/sign-in/sign-out, account ownership checks and cross-account read/claim denial passed. Signed-out profile preference writes were rejected.
- Two guided-workspace browser checks passed: full account/upload/metadata-lock journey including a fresh browser returning to saved work with its guide choice; trial voice navigation, actual-save reward, voice verification, Undo and swipe disqualification.
- Existing action voice save/refresh and unavailable-browser guidance passed.
- Polygon drawing/edit/undo/export/recoverable review passed after adapting test navigation to the new feature buttons.
- Voice visibility/reappearance safeguards, sampled track review and laptop trial playback/voice/export checks passed.
- Batched desktop/phone captures inspected; no horizontal overflow. Scoped independent finish review disposition: ship. Design detector returned no findings.

## Limits

- Google sign-in is disabled until the owner creates Google credentials and configures them privately. Callback: `https://precious-fish-294.convex.site/api/auth/callback/google`.
- Email verification and password reset are not implemented; the sign-in screen discloses this.
- Speech command checks inject recognition results in a real browser. Actual microphone hardware, accent and recognition quality require a spoken user check.
- No new vision models, model accuracy claims or general tracking capability are included.
- Frontend release and public-site verification are recorded below when completed.

## Live release
Code checkpoint e961a76 pushed to GitHub. Cloudflare Pages release 810a769a published to https://cheddarvox.com. All six relevant live browser checks passed (1.2 minutes): polygons, sampled tracking review, account/upload/metadata locks plus fresh-browser guide restoration, guided voice/swipe review, voice visibility/reappearance safeguards and action voice save/refresh. Live desktop and 390px phone captures inspected without horizontal overflow. Browser checks used test-only public Cloudflare routing with normal certificate verification because of the existing local Wi-Fi DNS issue; no device or router settings changed. Google remains disabled pending owner credentials.
