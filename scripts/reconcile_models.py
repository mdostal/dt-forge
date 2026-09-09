#!/usr/bin/env python3
"""Reconcile MODELS.md status emoji against what's actually on disk.

Usage:
    python3 scripts/reconcile_models.py            # report mismatches only
    python3 scripts/reconcile_models.py --apply     # also rewrite MODELS.md

Status is monotonic and never regresses automatically:
    unpulled(0) < pulled(1) < sliced(2) < printed(3)

A model's evidence-based floor is:
    - a raws/<section>/ file whose name contains the model's MakerWorld
      numeric ID  -> at least "pulled"
    - a sliced/ file (*.gcode.3mf) whose name contains the model's ID
      -> at least "sliced"
    - a mention of the model's title in print-log.md
      -> "printed"

The script only ever raises a row's status to match evidence; it never
lowers a status that's already ahead of what it can detect (e.g. it will
not un-mark a model as printed just because print-log.md wording changed).
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MODELS_MD = REPO_ROOT / "MODELS.md"
PRINT_LOG = REPO_ROOT / "print-log.md"
RAWS_DIR = REPO_ROOT / "raws"
SLICED_DIR = REPO_ROOT / "sliced"

STATUS_ORDER = ["⬜", "✅", "🎚️", "🖨️"]
STATUS_RANK = {s: i for i, s in enumerate(STATUS_ORDER)}

# Maps a MODELS.md section heading (substring match) to its raws/ subfolder.
SECTION_TO_RAWS_DIR = {
    "Clarabel's first prints": "kids-toys",
    "Printer tools": "printer-tools",
    "Functional": "functional",
}

MODEL_ID_RE = re.compile(r"models/(\d+)")
TABLE_ROW_RE = re.compile(
    r"^\|\s*(?P<model>[^|]+?)\s*\|\s*(?P<creator>[^|]+?)\s*\|\s*(?P<license>[^|]+?)\s*\|"
    r"\s*(?P<status>[^|]+?)\s*\|\s*(?P<link>[^|]+?)\s*\|\s*$"
)


@dataclass
class ModelRow:
    line_index: int
    title: str
    status: str
    link: str
    raws_subdir: str | None
    model_id: str | None
    evidence: list[str] = field(default_factory=list)


def parse_models_md(text: str) -> list[ModelRow]:
    rows: list[ModelRow] = []
    current_section: str | None = None
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("## "):
            current_section = line[3:].strip()
            continue
        if not line.startswith("|") or line.startswith("|---"):
            continue
        m = TABLE_ROW_RE.match(line)
        if not m:
            continue
        if m.group("model").strip().lower() == "model":
            continue  # header row
        link = m.group("link").strip()
        id_match = MODEL_ID_RE.search(link)
        raws_subdir = None
        if current_section:
            for key, subdir in SECTION_TO_RAWS_DIR.items():
                if key.lower() in current_section.lower():
                    raws_subdir = subdir
                    break
        rows.append(
            ModelRow(
                line_index=i,
                title=m.group("model").strip(),
                status=m.group("status").strip(),
                link=link,
                raws_subdir=raws_subdir,
                model_id=id_match.group(1) if id_match else None,
            )
        )
    return rows


def scan_dir_for_id(directory: Path, model_id: str) -> list[str]:
    if not directory.is_dir():
        return []
    return [p.name for p in directory.rglob("*") if p.is_file() and model_id in p.name]


def evidence_floor(row: ModelRow, print_log_text: str) -> tuple[str, list[str]]:
    """Return (floor_status, evidence_notes) — the highest status disk evidence supports."""
    evidence: list[str] = []
    floor = "⬜"

    if row.model_id and row.raws_subdir:
        matches = scan_dir_for_id(RAWS_DIR / row.raws_subdir, row.model_id)
        if matches:
            floor = "✅"
            evidence.append(f"raws/{row.raws_subdir}/{matches[0]}")

    if row.model_id:
        matches = scan_dir_for_id(SLICED_DIR, row.model_id)
        if matches:
            floor = "🎚️"
            evidence.append(f"sliced/{matches[0]}")

    if row.title and row.title.lower() in print_log_text.lower():
        floor = "🖨️"
        evidence.append("print-log.md mention")

    return floor, evidence


def reconcile(models_text: str, print_log_text: str) -> tuple[list[ModelRow], list[tuple[ModelRow, str, str]]]:
    """Returns (all_rows, changes) where changes is [(row, old_status, new_status), ...]."""
    rows = parse_models_md(models_text)
    changes: list[tuple[ModelRow, str, str]] = []
    for row in rows:
        floor, evidence = evidence_floor(row, print_log_text)
        row.evidence = evidence
        current_rank = STATUS_RANK.get(row.status, 0)
        floor_rank = STATUS_RANK.get(floor, 0)
        if floor_rank > current_rank:
            changes.append((row, row.status, floor))
    return rows, changes


def apply_changes(models_text: str, changes: list[tuple[ModelRow, str, str]]) -> str:
    lines = models_text.splitlines()
    for row, old_status, new_status in changes:
        line = lines[row.line_index]
        # Replace exactly the status field, not any other occurrence of the emoji.
        parts = line.split("|")
        # parts[0] is empty (leading |); status is the 4th cell -> index 4
        status_idx = 4
        if status_idx < len(parts) and old_status in parts[status_idx]:
            parts[status_idx] = parts[status_idx].replace(old_status, new_status, 1)
            lines[row.line_index] = "|".join(parts)
    return "\n".join(lines) + ("\n" if models_text.endswith("\n") else "")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write status changes back to MODELS.md")
    parser.add_argument("--models-md", type=Path, default=MODELS_MD)
    parser.add_argument("--print-log", type=Path, default=PRINT_LOG)
    args = parser.parse_args()

    models_text = args.models_md.read_text()
    print_log_text = args.print_log.read_text() if args.print_log.exists() else ""

    rows, changes = reconcile(models_text, print_log_text)

    print(f"Checked {len(rows)} models.")
    if not changes:
        print("No mismatches — MODELS.md matches disk evidence.")
        return 0

    print(f"{len(changes)} mismatch(es):")
    for row, old_status, new_status in changes:
        evidence = "; ".join(row.evidence) if row.evidence else "no evidence"
        print(f"  {row.title}: {old_status} -> {new_status}  ({evidence})")

    if args.apply:
        updated = apply_changes(models_text, changes)
        args.models_md.write_text(updated)
        print(f"\nApplied {len(changes)} update(s) to {args.models_md}.")
    else:
        print("\nRun with --apply to write these changes to MODELS.md.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
