# Version 2 video workflow and notices release

Published 2026-10-10 using the existing `npm run deploy` command. Frontend deployment: `4caf3525`, https://4caf3525.naive-physics.pages.dev . Public app: https://cheddarvox.com/v2 . Notices: https://cheddarvox.com/licenses/ . Source access: https://cheddarvox.com/licenses/onnx-sources/ . Existing Cloudflare project name is only the hosting identifier; the source remains this annotation-tool repository. No hosting migration.

Release scope: existing V2 first solo video workflow plus the collected third-party notices and source-access materials. No outreach files or unrelated application changes included. Existing V1 remains accessible; no V1 records migrated or deleted.

## Validation

- `npx vitest run`: 32 tests passed across 16 files.
- Deployment's production build and Convex function preparation passed; deployed frontend CSS/JS matched the local build on the public domain.
- Live `tests/v2-video.spec.ts`: passed drawing, simulated speech start/stop and tool activation, correction, reload recovery, offline queue recovery, swipe review/undo, COCO and frame/COCO ZIP exports and V1 data separation. Screenshots captured in outputs. Simulated speech proves command wiring, not physical microphone hardware.
- Live `tests/v2-private-video.spec.ts`: passed private upload, saved keypoint annotation, unauthorised query rejection and fresh-browser sign-in/reopening. Uses an isolated test account and test-uploaded footage, not customer records.
- Live `scripts/check-onnx-source-page.mjs --live`: passed notice-to-source navigation, every local source-page download, source archive SHA-256 and contents, MPL presence and desktop/390px phone fit.
- V1 playback spec was initially skipped because its required environment flag was absent; rerun separately with `EXPECT_CLOUDFLARE_TRIAL=1` passed, including reload and no Convex sample-video downloads. No failed live tests remain in these runs.

## Scope and limits

This is the first V2 video workflow, not the complete agreed V2 feature list. V2 AI mask suggestions, automatic tracking, skeletons, cuboids, audio/image workflows, custom AI connections, team workflows and full analytics are still pending. Existing V1 AI features are not relabelled as completed V2 features.

The source-access work addresses identified notice/source omissions; the complete component manifest of the prebuilt ONNX WASM binary remains unverified. NanoTrack project Apache licensing evidence and model provenance limits remain in the targeted audit. This release is not a whole-product legal certification.

Deployment reported the Convex account is above free-plan limits and could face service interruption. Deployment and current live flows succeeded. No paid upgrade, plan purchase, quota bypass or deletion was performed. Account usage needs follow-up.
