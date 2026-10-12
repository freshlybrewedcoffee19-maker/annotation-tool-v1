# Project hosting

- User reconfirmed on 12 October 2026: keep Cloudflare hosting. Do not migrate hosting to Convex.
- The live website is https://cheddarvox.com, hosted on Cloudflare Pages.
- Publish with `npm run deploy`; the existing script builds the app, updates the Convex backend, publishes Cloudflare Pages, and checks the live frontend.
- Convex remains the backend, database, and sign-in service. Preserve existing private video storage and saved user data.
- This hosting choice supersedes older instructions that require Convex static hosting.
- Run every shell command with `workdir` set to the absolute project path, `C:\Users\Riya\build-sprint-app`.
