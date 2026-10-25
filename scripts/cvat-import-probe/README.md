# Isolated CVAT temporal-label import proof

This is a compatibility experiment, not a shipped export feature. It reads no Cheddar Vox records, contacts no Convex deployment, changes no app dependencies, and starts no server. The synthetic task represents a ten-second, 25-frames-per-second video. No real video is decoded.

## Run

From the project root, using Python 3.12 or newer:

```powershell
python scripts/cvat-import-probe/run.py --prepare
python scripts/cvat-import-probe/run.py
```

Preparation downloads about 203 KB of pinned source and the parser dependency to `.np-tools-private/cvat-import-probe`. Every file's SHA-256 is checked before execution. It installs nothing globally or into the application. The second command makes no network requests. The preparation command does not run tests.

## What is actually executed

Official CVAT commit `454d60c31a59cb411d82660a3644e29d8fef7bb0` (9 October 2026), the same revision as the existing upstream reference checkout:

- `cvat/apps/dataset_manager/formats/cvat.py`: `_import` (raw XML branch) and `load_anno`.
- `cvat/apps/dataset_manager/bindings.py`: `match_dm_item`, tag/attribute records, frame-name matching and relative/absolute frame conversion, label lookup, tag/attribute conversion, and `add_tag`.
- The actual `defusedxml==0.7.1` dependency used for XML parsing.

The script parses the pinned Python source into syntax nodes, selects these existing function/class bodies, and executes them unchanged. It does **not** reimplement the CVAT XML parser. It reduces class containers to relevant methods to avoid loading Django and the server. CVAT's MIT license is retained alongside the downloaded source.

Test-only replacements are the importer-registration decorator, Datumaro's simple `Image`/`DatasetItem` holders and integer-cast utility, task mode/attribute type constants, database task/label/attribute objects, and the annotation collection. The real upstream frame mappings are initialized from synthetic video dimensions and frame metadata. Imported tags are appended to memory; a database callback is forbidden. No database transaction, REST API, ZIP/project import, authentication, UI, media decoding, server-side validation, or persistence is tested.

## Candidate format and findings to verify

Cheddar Vox intervals become native CVAT **frame tags** inside `<image>` elements; the raw XML uses CVAT's `CVAT 1.1` importer. This is classification, not a box or polygon track. The separate **CVAT for video** exporter does not support classification, according to CVAT's documentation.

The candidate explicitly uses half-open time intervals: include frames whose presentation time is at or after the start and before the end. For constant rate `fps`, frame indices are `ceil(start * fps)` through `ceil(end * fps) - 1`. Rational arithmetic avoids decimal floating-point boundary drift. This convention is the experiment's choice, not a claim that CVAT natively stores temporal video segments.

Each tag carries a stable synthetic segment ID and the exact original start/end strings, and groups preserve overlapping/repeated labels. `exact-segments.json` is a separate lossless backup. The label definitions in `label-schema.json` must be installed in the target task: the real importer rejects unknown labels and drops undeclared attributes. Merely adding XML metadata is not enough.

Tests cover overlaps, repeated labels, Unicode/XML escaping, exact attributes, fractional frame rate, exclusive end boundaries, last frame, unknown frame timing, sub-frame intervals, missing labels/attributes, out-of-range frames, and XML entity protection.

## Limits before shipping an export

- Uploaded Cheddar Vox episodes currently do not reliably have frame-rate metadata. Do not assume 30 fps or infer a rate from duration alone.
- Variable-frame-rate phone video requires actual frame presentation timestamps. The candidate refuses it; it also refuses sub-frame segments that would otherwise disappear.
- The candidate assumes the same full, untrimmed, unsampled source video and exact target label/attribute definitions. A future exporter must handle/validate target frame ranges, frame step, file identity, and duplicate filenames.
- Passing these isolated tests proves acceptance by the pinned parser/binding path with the specified adapters. It does **not** prove a complete CVAT task import or UI rendering. A disposable CVAT task using a synthetic video remains the next integration check when an account or local server is available.

Sources: [official importer](https://github.com/cvat-ai/cvat/blob/454d60c31a59cb411d82660a3644e29d8fef7bb0/cvat/apps/dataset_manager/formats/cvat.py), [official bindings](https://github.com/cvat-ai/cvat/blob/454d60c31a59cb411d82660a3644e29d8fef7bb0/cvat/apps/dataset_manager/bindings.py), [native format documentation](https://docs.cvat.ai/docs/dataset_management/formats/format-cvat/), [video frame tags](https://docs.cvat.ai/docs/annotation/manual-annotation/modes/annotation-with-tags/).
