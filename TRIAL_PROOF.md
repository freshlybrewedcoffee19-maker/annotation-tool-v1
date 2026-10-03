# Browser-private trial proof

Live URL: https://precious-fish-294.convex.site/

Five checks passed in one minute: upload/edit/delete/exports/refresh, interval coverage, browser isolation, shared voice handler with interim deduplication, and custom labels. Real microphone recognition was not automated.

## Live Chrome and Edge observations

```text
Chrome after one click:
Current step: Annotate
Video: IRON_001_trial_45s.mp4; 45 sec
Labels: initial_state, approach, position, reposition, slip, iron_hold
Metadata: 32 filled fields
Mic button: Turn mic on; height 86 px; enabled true
Label by hand: collapsed
Videos in this workspace: 1
Segments initially: 0
Edge after one click:
Current step: Annotate
Video: IRON_001_trial_45s.mp4; 45 sec
Labels: initial_state, approach, position, reposition, slip, iron_hold
Metadata: 32 filled fields
Mic button: Turn mic on; height 86 px; enabled true
Label by hand: collapsed
Videos in this workspace: 1
Segments initially: 0
Two different private workspaces: true
After Chrome saves and both refresh: Chrome 1 segment; Edge 0 segments
Chrome CSV:
episode,label,start_sec,end_sec
"IRON_001_trial_45s.mp4","approach",1,2
Edge CSV:
episode,label,start_sec,end_sec

Edge reading Chrome video by ID: rejected
Original saved workspace: 93 videos; 148 segments preserved
DESKTOP AND MOBILE: no page overflow
```

## Raw npm run deploy output

```text

> build-sprint-app@1.0.0 deploy
> npx convex dev --once && npx @convex-dev/static-hosting upload --build

(node:13752) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
Found multiple VITE_CONVEX_URL environment variables in .env.local so cannot update automatically.
▌ Developing against deployment:
▌ [Development] freshlybrewedcoffee19:build-sprint-app:dev/freshlybrewedcoffee19 (dev) (dashboard: https://dashboard.convex.dev/t/freshlybrewedcoffee19/build-sprint-app/precious-fish-294)
▌ └─ https://precious-fish-294.convex.cloud
- Preparing Convex functions...

Convex AI files are not installed. Run npx convex ai-files install to get started or npx convex ai-files disable to hide this message.
✔ 01:33:54 Convex functions ready! (2.22s)
🔨 Building for development...
   Build command: npm run build
   VITE_CONVEX_URL=https://precious-fish-294.convex.cloud
   STATIC_HOSTING_BASE_PATH=/


> build-sprint-app@1.0.0 build
> tsc --noEmit && vite build

vite v8.3.2 building client environment for production...
transforming...
✓ 103 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.35 kB │ gzip:  0.26 kB
dist/assets/index-C_yZqofM.css   10.19 kB │ gzip:  2.61 kB
dist/assets/index-BGtoM9fB.js   323.80 kB │ gzip: 97.81 kB

✓ built in 237ms

🚀 Deploying to development environment
🔒 Using secure internal functions (requires Convex CLI auth)
Uploading 4 files with deployment ID: 2e7338f2-0e5c-40f2-bb07-4d832c92f77a
Component: staticHosting

  Generating 4 upload URLs...
  [1/4] /assets/index-C_yZqofM.css (storage)
  [2/4] /index.html (storage/html)
  [3/4] /sample.mp4 (storage)
  [4/4] /assets/index-BGtoM9fB.js (storage)
  Staging manifest chunk 1/1...
  Publishing deployment...

Cleaned up 4 old storage file(s) from previous deployments

✨ Upload complete!

Your app is now available at: https://precious-fish-294.convex.site

```
