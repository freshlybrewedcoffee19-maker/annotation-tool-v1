# Follow-up source checks

Checked 2026-10-10. No services, authentication code or package versions changed. No enquiries sent.

All six outstanding entries were checked against official npm or source-repository evidence. No new commercial prohibition was identified. The six entries remain evidence questions, not findings that commercial use is banned.

- **Convex Auth 0.0.96:** the exact published source revision contains `src/server/oauth/NOTICE.txt`, retaining an Auth.js ISC notice. This has now been collected. The only full Apache licence located in the recursive source listing is `test-nextjs/LICENSE.txt`, which names Convex, Inc.; its location in a test application is not treated as proof of its scope over the whole library. The main package independently declares Apache-2.0. Keep the main notice clarification open; no authentication replacement is proposed.
- **Three AWS packages:** official SDK root Apache licence is available. Their current internal-package directories do not supply separate LICENSE files at the checked paths. A missing file is not a commercial ban, and Apache does not require inventing a NOTICE if none exists. Exact release/source mapping and applicable original notices still need confirmation before these evidence entries are closed.
- **guid-typescript 1.0.9:** the current official repository tree contains no matching licence/notice filename. GitHub does not resolve the npm-reported commit in that repository (HTTP 422). Other companies' notice lists are not used to invent the original holder.
- **server-only 0.0.1:** official npm metadata confirms MIT; the original copyright text/source revision remains unidentified. Community comments making conflicting holder claims are not authoritative evidence. Do not assign React's copyright merely from the package homepage.

Raw official-source checks and SHA-256 hashes are in `upstream-notice-checks/results.json`. HTTP failures establish only the outcome of that request, not absence of rights. Current AWS main is context, not proof of exact-version provenance.

## Reassessment: contact is optional, not a licence requirement

The earlier recommendation to contact maintainers as the required next step was too strong. None of the reviewed Apache-2.0, MIT or ISC texts requires asking permission or contacting a maintainer for ordinary permitted commercial use. Published declarations are relevant evidence; missing files do not establish a commercial ban.

**Four Apache entries (Convex Auth and the three AWS packages):** classify as notice-completion/source-mapping housekeeping, not requests for a new commercial grant. Supply the standard Apache-2.0 text with the collection and retain applicable original notices already found. Apache section 4(d) requires preservation of an existing applicable NOTICE, not creating a notice that upstream never supplied. The test-app licence must not be presented as a new library-wide grant. We do not assert that all original notices have been identified, or that full compliance has been proven.

**Two MIT/ISC entries (server-only and guid-typescript):** retain their published declarations; record original copyright notice as not located rather than invent a holder. These remain attribution-evidence questions because the licence conditions preserve copyright and permission notices. A generic licence template alone does not establish that every original notice is retained. Contact can help resolve this, but is not prescribed by either licence; a documented distribution assessment or a tested replacement are other routes. No package is being removed on this record.

**Separate model/runtime questions:** NanoTrack's model-weight scope and ONNX's exact WASM composition are not part of the six missing package notices and are not cleared by this reassessment.

The draft enquiries in `permission-followups.csv` are optional fallbacks. No messages have been sent or are authorised by this document. Next: finish the applicable licence-copy collection and distribution assessment before deciding whether any external clarification is useful.

Sources: https://www.apache.org/licenses/LICENSE-2.0 (sections 2, 4); https://opensource.org/license/mit; https://opensource.org/license/isc.

## Local browser distribution checked

`scripts/check-notice-distribution.mjs` inspected Vite's rendered JavaScript module records for the main app and both worker builds, using the existing build configuration with output writes disabled. `browser-notice-distribution.json` records the results.

- Convex Auth React code is present in the main browser bundle. Its declared Apache-2.0 licence copy is now included explicitly, together with the conservatively collected embedded notices.
- The three AWS internal packages, guid-typescript and server-only have no rendered JavaScript modules in the checked browser chunks. This narrows the browser-notice concern; it does not remove them from the installed inventory or assess their presence in Convex backend/CLI bundles.
- The four Apache packages now have the official standard Apache licence text in the generated notice collection, identified as a standard copy rather than an upstream package-specific notice. Original attribution/source mapping limits remain recorded. The two MIT/ISC original-notice uncertainties remain internal follow-up items; neither appears in the checked browser JavaScript.
- This check does not inspect embedded WASM libraries or establish NanoTrack weight rights. Nothing has been deployed or sent to maintainers.

## Local backend distribution checked

`scripts/check-backend-notice-distribution.mjs` builds local backend entry points in memory using the installed Convex bundler's esbuild settings, grouping Node and isolate sources and reproducing its server-only and async_hooks stubs. It does not execute backend functions, load credentials, contact Convex or deploy. This is an offline diagnostic rather than an inspection of live deployment bundles. Results are saved in `backend-notice-distribution.json`.

- The three AWS packages contribute rendered code to the Node backend bundle used for private storage. Keep their declared Apache licence copies and existing applicable notices; their presence is not evidence of a commercial ban. This report does not prove those optional credential-provider branches execute for our explicit R2 credentials.
- Convex Auth contributes rendered code to the isolate backend bundle. Retain its Apache licence copy and collected embedded notices.
- guid-typescript and server-only contribute no rendered code to either checked backend runtime or the previously checked frontend. Their original attribution questions can remain inventory follow-ups rather than being represented as demonstrated distribution gaps for the current app. This is not a claim they are absent from all prebuilt local tooling, third-party component bundles or historical releases.

The six package-file omissions therefore do not establish a need to request commercial permission. No packages, sign-in logic or storage logic were changed. Model-weight permission scope and embedded ONNX WASM obligations remain separate unresolved questions.
