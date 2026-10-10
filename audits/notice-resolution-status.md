# Follow-up source checks

Checked 2026-10-10. No services, authentication code or package versions changed. No enquiries sent.

All six outstanding entries were checked against official npm or source-repository evidence. No new commercial prohibition was identified. The six entries remain evidence questions, not findings that commercial use is banned.

- **Convex Auth 0.0.96:** the exact published source revision contains `src/server/oauth/NOTICE.txt`, retaining an Auth.js ISC notice. This has now been collected. The only full Apache licence located in the recursive source listing is `test-nextjs/LICENSE.txt`, which names Convex, Inc.; its location in a test application is not treated as proof of its scope over the whole library. The main package independently declares Apache-2.0. Keep the main notice clarification open; no authentication replacement is proposed.
- **Three AWS packages:** official SDK root Apache licence is available. Their current internal-package directories do not supply separate LICENSE files at the checked paths. A missing file is not a commercial ban, and Apache does not require inventing a NOTICE if none exists. Exact release/source mapping and applicable original notices still need confirmation before these evidence entries are closed.
- **guid-typescript 1.0.9:** the current official repository tree contains no matching licence/notice filename. GitHub does not resolve the npm-reported commit in that repository (HTTP 422). Other companies' notice lists are not used to invent the original holder.
- **server-only 0.0.1:** official npm metadata confirms MIT; the original copyright text/source revision remains unidentified. Community comments making conflicting holder claims are not authoritative evidence. Do not assign React's copyright merely from the package homepage.

Raw official-source checks and SHA-256 hashes are in `upstream-notice-checks/results.json`. HTTP failures establish only the outcome of that request, not absence of rights. Current AWS main is context, not proof of exact-version provenance.

Next external step: obtain authoritative source/notice pointers using the draft questions in `permission-followups.csv`. Until then, preserve the declared licences and collected notices and keep the uncertainty visible in the internal audit. NanoTrack weight scope and exact ONNX WASM composition remain separate checks.
