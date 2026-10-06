# Cloudflare website preparation

User approved moving website hosting and the public trial video to Cloudflare on 6 October 2026. Convex remains the backend/database. No user uploads, workspaces or annotations are moved or deleted.

Cloudflare Pages build settings (published through terminal Direct Upload):

- Repository: freshlybrewedcoffee19-maker/annotation-tool-v1
- Production branch: main
- Build command: npm run build
- Output directory: dist
- VITE_CONVEX_URL: https://precious-fish-294.convex.cloud
- VITE_TRIAL_VIDEO_PATH: /videos/iron-e05a44b0.mp4

The public iron trial is 1,829,761 bytes, SHA-256 e05a44b0be391b7dc6a60f72591f598d20d6ca1b4a572bba730f46d51901da1e. It is bundled as a static asset, below Pages' 25 MiB file limit. No R2 account/storage is needed for this file. Hashed video and application assets have long browser cache headers. With no top-level 404.html, Pages uses its SPA fallback for /workspace and /setup.

Set the trial-path variable only for Cloudflare builds. Existing Convex builds keep their current video URL. Only the named trial in a trial workspace receives the public URL; personal videos retain their existing private URLs. Saved trial output is hash-checked before review import.

Important cutover requirement: browser localStorage is specific to each website origin. Moving domains does not delete Convex data, but an existing workspace will not automatically appear on a different domain. Before switching users, provide a safe explicit workspace-transfer path and validate it on the final domain. Do not put workspace tokens in repository files, logs, screenshots, or query strings. Keep the old site available during verification.

Cloudflare sign-in and publishing are complete. Custom-domain connection is pending the user's domain name. Do not change DNS records for mail or remove the existing Convex hosting. npm run deploy still publishes Convex; it does not publish Cloudflare. This is a Direct Upload project: GitHub pushes do not publish the Cloudflare website. Build with the variables above, then run npx --yes wrangler pages deploy dist --project-name naive-physics --branch main. Convex backend changes still need their own deployment.

Verification: production build with the Cloudflare variables passed. Four browser checks passed against the built preview: returning-workspace restore, complete track review/export, simulated voice visibility and bundled trial playback after refresh. The trial-playback check observed zero Convex storage-download requests. Live Cloudflare hosting, cache headers and microphone hardware are not yet verified because publishing awaits sign-in and domain setup.

Live website: https://naive-physics.pages.dev . Deployment: 50d68497 (6 October 2026). Four live browser checks passed: landing/returning workspace, saved track review and export, simulated voice visibility, and bundled trial playback/refresh without Convex storage downloads. Public video cache header verified: public, max-age=31536000, immutable. Actual microphone hardware still needs a user spoken check. The old Convex site remains available, preserving access to existing browser workspaces. No custom domain or DNS records were changed; no plan purchase was made.

Custom domain completed: https://cheddarvox.com . User updated Hostinger nameservers to dina.ns.cloudflare.com and neil.ns.cloudflare.com and replaced the parked A record with the apex CNAME targeting naive-physics.pages.dev. Cloudflare zone and Pages domain both report active; HTTPS returned 200 without bypassing certificate checks. All four browser checks passed on the custom domain: landing/returning workspace, tracking review/save/export, simulated voice visibility and bundled trial playback/refresh with no Convex video downloads. Existing browser workspaces remain accessible at their original site; a new domain uses separate browser storage. Real mic capture needs a user spoken check. The www hostname was not registered as a Pages custom domain in this task.

Cheddar Vox rebrand: code 0550884, Cloudflare deployment 551fe3c5. Company name updated on landing, guided setup, dashboard, loading screen and page title; tagline Voice led video annotation tool. Approved seven-color palette applied to backgrounds, cards, brand accents, primary/secondary actions and voice controls; laptop and phone visuals inspected. Four local and four live checks passed. Initial live Chrome checks encountered QUIC protocol errors/timeouts; retry with --disable-quic passed all four. Published title and brand verified; primary action computed color rgb(255,184,46) and navy foreground rgb(23,32,51). No saved data or backend records changed.

Domain/HTTPS repair — 6 October 2026: apex already had valid HTTPS (200) and HTTP→HTTPS (301). www initially returned Cloudflare 522 because it was absent from Pages custom domains; connected www.cheddarvox.com through the authenticated Pages API. Both Pages domains now active; strict-certificate HTTP checks and Chrome secure-context checks passed against current public Cloudflare routing. No certificate validation bypass used; browser test explicitly mapped names to their publicly resolved Cloudflare address because local Wi-Fi DNS still returned Hostinger 2.57.91.91. Both HTTP addresses redirect to their HTTPS versions.

Remaining local issue: router DNS 192.168.29.1 resolves apex to old Hostinger parking, while 1.1.1.1 returns Cloudflare and current Cloudflare nameservers. Clearing Windows DNS cache did not fix the router response. User confirmed https://cheddarvox.com opens over mobile data with Wi-Fi off. No hosts-file override found. Permission requested before changing this laptop's global DNS setting; not changed yet. Existing database, browser tokens and annotations unchanged.
