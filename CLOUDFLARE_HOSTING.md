# Cloudflare website preparation

User approved moving website hosting and the public trial video to Cloudflare on 6 October 2026. Convex remains the backend/database. No user uploads, workspaces or annotations are moved or deleted.

Cloudflare Pages Git integration settings:

- Repository: freshlybrewedcoffee19-maker/annotation-tool-v1
- Production branch: main
- Build command: npm run build
- Output directory: dist
- VITE_CONVEX_URL: https://precious-fish-294.convex.cloud
- VITE_TRIAL_VIDEO_PATH: /videos/iron-e05a44b0.mp4

The public iron trial is 1,829,761 bytes, SHA-256 e05a44b0be391b7dc6a60f72591f598d20d6ca1b4a572bba730f46d51901da1e. It is bundled as a static asset, below Pages' 25 MiB file limit. No R2 account/storage is needed for this file. Hashed video and application assets have long browser cache headers. With no top-level 404.html, Pages uses its SPA fallback for /workspace and /setup.

Set the trial-path variable only for Cloudflare builds. Existing Convex builds keep their current video URL. Only the named trial in a trial workspace receives the public URL; personal videos retain their existing private URLs. Saved trial output is hash-checked before review import.

Important cutover requirement: browser localStorage is specific to each website origin. Moving domains does not delete Convex data, but an existing workspace will not automatically appear on a different domain. Before switching users, provide a safe explicit workspace-transfer path and validate it on the final domain. Do not put workspace tokens in repository files, logs, screenshots, or query strings. Keep the old site available during verification.

Publishing is pending Cloudflare sign-in and the user's domain name. Do not change DNS records for mail or remove the existing Convex hosting. npm run deploy still publishes Convex; it does not publish Cloudflare. Once Git integration is enabled, pushes to the configured production branch trigger Cloudflare website builds; Convex backend changes still need their own deployment.

Verification: production build with the Cloudflare variables passed. Four browser checks passed against the built preview: returning-workspace restore, complete track review/export, simulated voice visibility and bundled trial playback after refresh. The trial-playback check observed zero Convex storage-download requests. Live Cloudflare hosting, cache headers and microphone hardware are not yet verified because publishing awaits sign-in and domain setup.
