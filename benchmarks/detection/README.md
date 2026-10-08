# Local detection gate — 8 October 2026

Isolated experiment, not integrated or deployed. Existing annotation/database code is untouched by this experiment; unrelated unfinished collaboration changes predate it.

## Run

From the project folder: `node benchmarks/detection/local-server.mjs`, then open http://127.0.0.1:5193/benchmarks/detection/workspace.html . Model downloads are cached under ignored .cache; footage stays on this laptop. No paid inference or Cloudflare processing. Runtime dependencies are isolated in this folder.

## Actual results

- COCO-SSD lite_mobilenet_v2: corrected six-frame benchmark used downloaded browser-memory video plus presented-frame callbacks after seeking. Cold model load 11.984 s; frame processing 28.8–156.7 ms. Incorrect person/tie suggestions, no iron category. Initial benchmark that returned six empty results used stale frames and is invalid; results.json replaces it.
- OWL-ViT quantized q8: correctly decoded 15-second frame includes iron, hands and shirt. Cached load 1.269 s; inference 408.7 ms. At threshold .02, low-score iron suggestion enclosed the shirt, not the iron; hand candidates also require review. At .1 the preview returns no suggestions. Do not lower confidence to pretend iron detection succeeds. prompt-results.json contains the low-threshold diagnostic, not accepted annotations.
- Local preview checked in real Chrome at 1280 and 390 widths: inference finishes, button recovers, empty-results message appears, no horizontal overflow. Review controls are implemented but no real .1 detection candidate was available to exercise them; not claimed tested. Screenshot evidence in outputs/local-detection-*.png.

## Release decision

FAIL for iron detection. No accepted annotations, existing exports or backend writes. This experiment is not a finished product feature. Preview confirmations are temporary page state and not saved. No tracking, disappearance/reappearance handling, mask generation or accuracy claim.

Next gate: compare higher-precision prompt detection on the exact decoded iron frame and manually inspect enclosing box quality before any app integration. Generalisation, stronger/weaker laptops, latency, identity and absence tests remain open.

Sources: https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd ; https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/src/classes.ts ; https://huggingface.co/docs/transformers.js/api/pipelines ; https://huggingface.co/Xenova/owlvit-base-patch32 .
