"""Offline CVAT XML parser/binding proof; never imports the app or writes live data.

Run --prepare once to fetch small hash-pinned upstream files, then run without flags.
This is deliberately not a full CVAT server/UI integration test.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import io
import json
import math
import os.path as osp
from pathlib import Path
from fractions import Fraction
from types import SimpleNamespace
from typing import Any, NamedTuple, Sequence
import sys
import unittest
import urllib.request
import xml.etree.ElementTree as XmlWriter
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".np-tools-private" / "cvat-import-probe"
COMMIT = "454d60c31a59cb411d82660a3644e29d8fef7bb0"
UPSTREAM = f"https://raw.githubusercontent.com/cvat-ai/cvat/{COMMIT}/"
FILES = {
    "cvat.py": (UPSTREAM + "cvat/apps/dataset_manager/formats/cvat.py", "c000a8bfe5d929d19a621d510fb3ce050ad55380e028572986790b853a13b99a"),
    "bindings.py": (UPSTREAM + "cvat/apps/dataset_manager/bindings.py", "dee6d4adde277241478ed059353c4a056391dd9c5e4d46739a08e375818d9356"),
    "CVAT-LICENSE.txt": (UPSTREAM + "LICENSE", "f0c98c1710670f97a3dfab70829ec8739c12898463a6eb1bbddfc21821ae9c63"),
    "dependencies/defusedxml-0.7.1-py2.py3-none-any.whl": (
        "https://files.pythonhosted.org/packages/07/6c/aa3f2f849e01cb6a001cd8554a88d4c77c5c1a31c95bdf1cf9301e6d9ef4/defusedxml-0.7.1-py2.py3-none-any.whl",
        "a352e7e428770286cc899e2542b6cdaedb2b4953ff269a210103ec58f6198a61",
    ),
}
ATTRS = ("cheddarvox_segment_id", "cheddarvox_start_sec", "cheddarvox_end_sec")
SEGMENTS = [
    {"id": "synthetic-a", "label": "Pour & stir", "start_sec": "0.04", "end_sec": "0.16"},
    {"id": "synthetic-b", "label": "Pour & stir", "start_sec": "0.08", "end_sec": "0.20"},
    {"id": "synthetic-c", "label": "ढक्कन खोलें <open>", "start_sec": "1.001", "end_sec": "1.119"},
]


def checked_files(prepare: bool):
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (url, expected) in FILES.items():
        path = OUT / name
        if not path.exists() and prepare:
            path.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != expected:
                raise RuntimeError(f"Checksum mismatch for downloaded {name}; refusing execution")
            path.write_bytes(data)
        if not path.exists():
            raise RuntimeError(f"Missing {name}; first run: python scripts/cvat-import-probe/run.py --prepare")
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise RuntimeError(f"Checksum mismatch for {name}; refusing execution")


def build_upstream_namespace():
    # Zipimport uses the real pure-Python dependency directly, without pip install.
    wheel = OUT / "dependencies/defusedxml-0.7.1-py2.py3-none-any.whl"
    sys.path.insert(0, str(wheel))
    from defusedxml import ElementTree

    class Image:
        def __init__(self, path):
            self.path, self.ext = path, osp.splitext(path)[1]

        @classmethod
        def from_file(cls, path):
            return cls(path)

    class DatasetItem:
        def __init__(self, *, id, attributes, media):
            self.id, self.attributes, self.media = id, attributes, media

    def cast(value, kind):
        try:
            return kind(value)
        except (ValueError, TypeError):
            return None

    ns = {
        "__name__": "isolated_cvat_parser", "osp": osp, "zipfile": zipfile,
        "ElementTree": ElementTree, "DatasetItem": DatasetItem, "Image": Image,
        "NamedTuple": NamedTuple, "Sequence": Sequence, "Any": Any,
        "dm": SimpleNamespace(DatasetItem=DatasetItem, Image=Image),
        "models": SimpleNamespace(TaskMode=SimpleNamespace(INTERPOLATION="interpolation")),
        "datumaro": SimpleNamespace(util=SimpleNamespace(cast=cast)),
        "AttributeType": SimpleNamespace(NUMBER="number", CHECKBOX="checkbox", TEXT="text"),
        "importer": lambda **metadata: lambda fn: fn,
    }
    bindings = ast.parse((OUT / "bindings.py").read_text(encoding="utf-8"))
    cvat = ast.parse((OUT / "cvat.py").read_text(encoding="utf-8"))

    def compile_nodes(nodes, filename):
        module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), *nodes], type_ignores=[])
        exec(compile(ast.fix_missing_locations(module), filename, "exec"), ns)

    selected_methods = {
        "InstanceLabelData": {"Attribute", "_get_label_id", "_get_label_name", "_get_attribute_id", "_import_attribute"},
        "CommonData": {"Tag", "_abs_frame_id", "abs_frame_id", "_rel_frame_id", "rel_frame_id", "_init_frame_info", "_get_filename", "match_frame", "frame_info", "meta", "soft_attribute_import", "_import_tag", "add_tag", "_call_callback", "_len"},
    }
    for class_name, names in selected_methods.items():
        original = next(n for n in bindings.body if isinstance(n, ast.ClassDef) and n.name == class_name)
        # Only the class container is reduced. Selected upstream bodies/decorators stay unchanged.
        container = ast.ClassDef(name=class_name, bases=original.bases, keywords=[], body=[n for n in original.body if getattr(n, "name", None) in names], decorator_list=[])
        compile_nodes([container], str(OUT / "bindings.py"))
    compile_nodes([n for n in bindings.body if getattr(n, "name", None) in {"CvatImportError", "NoMediaInAnnotationFileError", "match_dm_item"}], str(OUT / "bindings.py"))
    compile_nodes([n for n in cvat.body if getattr(n, "name", None) in {"load_anno", "_import"}], str(OUT / "cvat.py"))
    return ns


def memory_task(ns, labels, *, frame_count=250, declare_attributes=True, start_frame=0, frame_step=1):
    task = ns["CommonData"]()
    task.META_FIELD = "task"
    task._meta = {"task": {"mode": "interpolation"}}
    task.rel_range = range(frame_count)
    task._frame_step = frame_step
    task._db_data = SimpleNamespace(start_frame=start_frame, deleted_frames=[], video=SimpleNamespace(width=640, height=360))
    task._db_subset = ""
    task._init_frame_info()
    task._soft_attribute_import = False
    task._label_mapping = {i: SimpleNamespace(id=i, name=name, parent_id=None) for i, name in enumerate(labels, 1)}
    task._attribute_mapping, task._attribute_mapping_merged = {}, {}
    for label_id in task._label_mapping:
        attributes = {i: name for i, name in enumerate(ATTRS, 1)} if declare_attributes else {}
        task._attribute_mapping_merged[label_id] = attributes
        task._attribute_mapping[label_id] = {"mutable": {}, "immutable": attributes, "spec": {i: SimpleNamespace(input_type="text") for i in attributes}}
    tags = []
    task._annotation_ir = SimpleNamespace(tags=tags, shapes=[], tracks=[], add_tag=tags.append)
    task._MAX_ANNO_SIZE = 30000
    task._create_callback = lambda _: (_ for _ in ()).throw(AssertionError("Database callback forbidden"))
    return task


def candidate_xml(segments, fps, frame_count, *, constant_rate=True):
    if not constant_rate or fps is None or Fraction(fps) <= 0:
        raise ValueError("Reliable constant frame timing is required; never assume 30 fps")
    fps = Fraction(fps)
    frames = {}
    for group, segment in enumerate(segments, 1):
        start, end = Fraction(segment["start_sec"]), Fraction(segment["end_sec"])
        if start < 0 or end <= start or end > Fraction(frame_count, 1) / fps:
            raise ValueError("Invalid segment boundaries")
        indices = list(range(math.ceil(start * fps), math.ceil(end * fps)))
        if not indices:
            raise ValueError("Sub-frame segment has no frame timestamp; must not silently disappear")
        for index in indices:
            frames.setdefault(index, []).append((group, segment))
    root = XmlWriter.Element("annotations")
    XmlWriter.SubElement(root, "version").text = "1.1"
    for index, annotations in sorted(frames.items()):
        image = XmlWriter.SubElement(root, "image", id=str(index), name=f"frame_{index:06d}.png", width="640", height="360")
        for group, segment in annotations:
            tag = XmlWriter.SubElement(image, "tag", label=segment["label"], group_id=str(group), source="manual")
            for name, value in zip(ATTRS, [segment["id"], segment["start_sec"], segment["end_sec"]]):
                XmlWriter.SubElement(tag, "attribute", name=name).text = value
    return XmlWriter.tostring(root, encoding="utf-8", xml_declaration=True)


NS = None


class CvatImportProof(unittest.TestCase):
    def run_import(self, xml, *, labels=None, **task_options):
        task = memory_task(NS, labels if labels is not None else list(dict.fromkeys(s["label"] for s in SEGMENTS)), **task_options)
        NS["_import"](io.BytesIO(xml), str(OUT), task)
        return task._annotation_ir.tags

    def test_01_actual_importer_keeps_overlaps_duplicate_labels_unicode_and_exact_seconds(self):
        tags = self.run_import(candidate_xml(SEGMENTS, "25", 250))
        self.assertEqual(len(tags), 8)
        expected_frames = {1: [1, 2, 3], 2: [2, 3, 4], 3: [26, 27]}
        for group, segment in enumerate(SEGMENTS, 1):
            matching = [tag for tag in tags if tag["group"] == group]
            self.assertEqual([t["frame"] for t in matching], expected_frames[group])
            for tag in matching:
                self.assertEqual({a["spec_id"]: a["value"] for a in tag["attributes"]}, dict(enumerate([segment["id"], segment["start_sec"], segment["end_sec"]], 1)))
                self.assertEqual(tag["source"], "file")
        self.assertEqual([t["label_id"] for t in tags if t["group"] == 3], [2, 2])
        (OUT / "imported-tags.json").write_text(json.dumps(tags, ensure_ascii=False, indent=2), encoding="utf-8")

    def test_02_fractional_30000_over_1001_rate_avoids_float_boundary_drift(self):
        segment = [{"id": "synthetic-rational", "label": "Pour & stir", "start_sec": "1.001", "end_sec": "1.1011"}]
        tags = self.run_import(candidate_xml(segment, "30000/1001", 300), frame_count=300)
        self.assertEqual([t["frame"] for t in tags], [30, 31, 32])
        self.assertEqual(tags[0]["attributes"][1]["value"], "1.001")

    def test_03_boundary_end_is_excluded_and_last_frame_is_valid(self):
        segments = [{"id": "end", "label": "Pour & stir", "start_sec": "9.96", "end_sec": "10"}]
        tags = self.run_import(candidate_xml(segments, "25", 250))
        self.assertEqual([t["frame"] for t in tags], [249])

    def test_04_unknown_or_variable_frame_timing_is_refused(self):
        for fps, constant in [(None, True), ("0", True), ("25", False)]:
            with self.subTest(fps=fps, constant_rate=constant), self.assertRaisesRegex(ValueError, "Reliable constant frame timing"):
                candidate_xml(SEGMENTS, fps, 250, constant_rate=constant)

    def test_05_subframe_segment_cannot_silently_disappear(self):
        with self.assertRaisesRegex(ValueError, "Sub-frame segment"):
            candidate_xml([{**SEGMENTS[0], "start_sec": "0.001", "end_sec": "0.002"}], "25", 250)

    def test_06_actual_binding_requires_labels_registered_in_target_task(self):
        with self.assertRaisesRegex(ValueError, "not registered for this task"):
            self.run_import(candidate_xml(SEGMENTS, "25", 250), labels=["Different label"])

    def test_07_actual_binding_drops_undeclared_attributes_so_label_schema_is_required(self):
        tags = self.run_import(candidate_xml(SEGMENTS, "25", 250), declare_attributes=False)
        self.assertEqual(len(tags), 8)
        self.assertTrue(all(tag["attributes"] == [] for tag in tags))

    def test_08_actual_frame_matcher_rejects_frame_outside_target_video(self):
        with self.assertRaisesRegex(NS["CvatImportError"], "Could not match item id"):
            self.run_import(candidate_xml(SEGMENTS, "25", 250), frame_count=2)

    def test_09_real_defusedxml_parser_rejects_entity_expansion(self):
        from defusedxml.common import EntitiesForbidden
        with self.assertRaises(EntitiesForbidden):
            self.run_import(b'<!DOCTYPE annotations [<!ENTITY test "bad">]><annotations><version>&test;</version></annotations>')


def main():
    global NS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", help="Download missing hash-pinned sources/dependency only; do not run tests")
    args = parser.parse_args()
    checked_files(args.prepare)
    if args.prepare:
        print("Prepared and verified four pinned inputs. No import test run, app changes, servers, or live writes.")
        return 0
    NS = build_upstream_namespace()
    print(f"Official CVAT source: {COMMIT}", flush=True)
    print("Scope: real XML importer, frame matcher, and tag bindings; in-memory task/media adapters. Full server/UI NOT tested.", flush=True)
    print("Synthetic records only. No server, app imports, network calls, user data, or deployment.", flush=True)
    (OUT / "synthetic-25fps.xml").write_bytes(candidate_xml(SEGMENTS, "25", 250))
    backup = {"synthetic": True, "video": {"name": "synthetic-10-seconds.mp4", "frame_count": 250, "frame_rate": "25/1"}, "interval_convention": "start inclusive, end exclusive; include frames whose presentation timestamp is in the interval", "segments": SEGMENTS}
    (OUT / "exact-segments.json").write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")
    label_schema = [{"name": label, "type": "tag", "attributes": [{"name": attr, "input_type": "text", "mutable": False, "default_value": "", "values": []} for attr in ATTRS]} for label in dict.fromkeys(s["label"] for s in SEGMENTS)]
    (OUT / "label-schema.json").write_text(json.dumps(label_schema, ensure_ascii=False, indent=2), encoding="utf-8")
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(CvatImportProof)
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    report = {"scope": "official XML parser and tag bindings with in-memory adapter, not full server/UI", "cvat_commit": COMMIT, "files": {name: {"url": url, "sha256": sha} for name, (url, sha) in FILES.items()}, "tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors), "success": result.wasSuccessful()}
    (OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Artifacts: {OUT}")
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
