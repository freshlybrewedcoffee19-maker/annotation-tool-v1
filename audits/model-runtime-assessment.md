# NanoTrack and ONNX Runtime: targeted check

Checked 2026-10-10. This check concerns the existing pinned artifacts, not proposed replacement tools. No app features disabled, no model changed, no deployment or maintainer message.

## NanoTrack V3

The two original ONNX model files are inside `NanoTrack/models/nanotrackv3/` at revision `248663fde6bf7c40190cf10ee396d5662919ecd3`. The complete recursive tree response was not truncated. It identifies a `NanoTrack/LICENSE` (Apache-2.0) and README; no model-specific licence/NOTICE/README is listed under that model directory. Both model hashes and the derived template hash are checked by the existing preparation script. The template changes shape declarations only; the change is disclosed in the shipped NOTICE.

**Finding:** Apache-2.0 is the applicable project-level licensing evidence available for these repository artifacts. It permits royalty-free commercial use and redistribution subject to its conditions. No separate commercial prohibition was found. A second model-specific licence file is not universally required, so its absence alone must not be recorded as proof that the models are prohibited or require an email permission request.

**Limit:** the project licence is evidence of an upstream grant, not independent proof of the contributor's rights over all training material or third-party contributions. This check did not establish a separate explicit statement naming the weights as covered. Record this as model provenance/scope uncertainty, not a demonstrated commercial ban. Do not infer dataset terms automatically transfer to model weights.

Sources: https://raw.githubusercontent.com/HonglinChu/SiamTrackers/248663fde6bf7c40190cf10ee396d5662919ecd3/NanoTrack/LICENSE ; https://raw.githubusercontent.com/HonglinChu/SiamTrackers/248663fde6bf7c40190cf10ee396d5662919ecd3/NanoTrack/README.md . Model-folder listing and hash evidence are in `model-runtime-evidence/`.

## ONNX Runtime Web

The installed runtime is `1.31.0-dev.20260914-8d85527a0`, source commit `8d85527a010e294a26b274749f74294b2a32cec5`. Its own licence is Microsoft's MIT licence, permitting commercial use with the notice retained. The exact Microsoft licence and broad upstream ThirdPartyNotices are already collected. That is not a commercial purchase, royalty or revenue-sharing requirement.

**Specific remaining duty:** the source dependency configuration pins Eigen to `1d8b82b0740839c0de7f1242a3585e3390ff5f33`. Eigen's COPYING.README identifies primarily MPL-2.0, with some compatible third-party licences. MPL can require informing recipients how to obtain the covered library source when executable library code is distributed. It does not require publishing the whole proprietary annotation app. Source pointers must match covered sources and any applicable upstream patches; simply placing MIT on the runtime page is not sufficient evidence for every bundled component.

The pinned WebAssembly CMake configuration links ONNX Runtime libraries and dependencies and conditionally links XNNPACK. A broad ThirdPartyNotices file contains optional-platform entries; it is not a precise manifest of our WASM binary. The attempted workflow path returned 404 and must not be treated as proof there is no build workflow. We have not reconstructed the release flags or established a complete binary component manifest. Therefore **the runtime's MIT commercial permission is confirmed; complete embedded-library compliance remains unverified**. This is a source/notice completion issue, not a discovered fee or commercial ban.

Sources: https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a010e294a26b274749f74294b2a32cec5/LICENSE ; https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a010e294a26b274749f74294b2a32cec5/cmake/deps.txt ; https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a010e294a26b274749f74294b2a32cec5/cmake/external/eigen.cmake ; https://raw.githubusercontent.com/eigen-mirror/eigen/1d8b82b0740839c0de7f1242a3585e3390ff5f33/COPYING.README ; https://www.mozilla.org/en-US/MPL/2.0/FAQ/ (Q7-Q11).

## Decision supported by this check

There is no demonstrated commercial-ban reason in this evidence to replace either component now. Keep the existing tool unchanged. Do not describe the complete product as legally cleared. NanoTrack provenance and the exact ONNX embedded-library/source obligations remain explicitly bounded uncertainties; contact is an optional evidence route, not a licence requirement.

## Source-access work completed locally

The identified Eigen source-access requirement is now implemented at `/licenses/onnx-sources/`, linked from the main notices page and generated notice collection:

- Full original Eigen source archive for the dependency revision, verified against the SHA-1 pinned in ONNX's dependency configuration and recorded with a SHA-256 checksum.
- The two matching ONNX Eigen patches, supplied separately and identified as upstream changes.
- Original Eigen MPL-2.0, BSD and MINPACK notices; original source-file headers remain in the archive.
- Pinned ONNX dependency source references and runtime source link.
- Emscripten 4.0.23 licence/authors and its musl copyright notice. This version is identified by the now-located pinned Linux WASM workflow, not assumed from a current release.

All collected source files are checked against a manifest by the normal notice-generation build step. It does not fetch these files during ordinary builds. The separate collection script can fetch missing material and checks the original Eigen archive against ONNX's dependency hash.

Validation: production build passed; real Chrome verified navigation from notices, all local source/download links, served archive checksum, source archive contents, MPL licence presence and desktop/390px phone fit. The first phone check caught long revision text overflow, fixed and rechecked successfully. No annotation code, model binary, auth code or backend function changed. Nothing deployed.

**Bounded conclusion:** the concrete Eigen source-access omission and identified toolchain notice omissions are addressed in the local frontend. This is not a certification that the exact prebuilt WASM binary's complete component list has been reconstructed; no such build-specific manifest was obtained. Retain that evidentiary limit without reclassifying it as a discovered commercial ban or a mandatory maintainer permission request.
