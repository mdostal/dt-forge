"""Tests for scripts/reconcile_models.py — run with: python3 -m pytest tests/"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.reconcile_models import (  # noqa: E402
    apply_changes,
    evidence_floor,
    parse_models_md,
    reconcile,
)

SAMPLE_MODELS_MD = """# Model Manifest

## 🧸 Clarabel's first prints — `raws/kids-toys/`

| Model | Creator | License | Status | Link |
|---|---|---|---|---|
| Bamboo Dragon (print-in-place) | Cinderwing3D x BambuLab | Personal | ⬜ | makerworld.com/en/models/154224-bamboo-dragon-cinderwing3d-x-bambulab |
| Flexi Baby Axolotl | MakerWorld | Personal | ✅ | makerworld.com/en/models/1490272-flexi-baby-axolotl |

## 🖨️ Printer tools — `raws/printer-tools/`

| Model | Creator | License | Status | Link |
|---|---|---|---|---|
| Modern Scraper (P1S/P2S/X1C) | MakerWorld | Personal | ⬜ | makerworld.com/en/models/1952560-modern-scraper-for-bambu-lab-p1s-p2s-x1c |
"""


def test_parse_models_md_extracts_rows_and_ids():
    rows = parse_models_md(SAMPLE_MODELS_MD)
    assert len(rows) == 3
    assert rows[0].title == "Bamboo Dragon (print-in-place)"
    assert rows[0].model_id == "154224"
    assert rows[0].raws_subdir == "kids-toys"
    assert rows[2].raws_subdir == "printer-tools"


def test_evidence_floor_detects_raws_file(tmp_path, monkeypatch):
    import scripts.reconcile_models as rm

    monkeypatch.setattr(rm, "RAWS_DIR", tmp_path / "raws")
    monkeypatch.setattr(rm, "SLICED_DIR", tmp_path / "sliced")
    (tmp_path / "raws" / "kids-toys").mkdir(parents=True)
    (tmp_path / "raws" / "kids-toys" / "154224-bamboo-dragon.3mf").write_text("x")

    rows = parse_models_md(SAMPLE_MODELS_MD)
    floor, evidence = evidence_floor(rows[0], print_log_text="")
    assert floor == "✅"
    assert "154224" in evidence[0]


def test_evidence_floor_detects_sliced_file(tmp_path, monkeypatch):
    import scripts.reconcile_models as rm

    monkeypatch.setattr(rm, "RAWS_DIR", tmp_path / "raws")
    monkeypatch.setattr(rm, "SLICED_DIR", tmp_path / "sliced")
    (tmp_path / "sliced").mkdir(parents=True)
    (tmp_path / "sliced" / "154224-bamboo-dragon-plate1.gcode.3mf").write_text("x")

    rows = parse_models_md(SAMPLE_MODELS_MD)
    floor, evidence = evidence_floor(rows[0], print_log_text="")
    assert floor == "🎚️"


def test_evidence_floor_detects_print_log_mention(tmp_path, monkeypatch):
    import scripts.reconcile_models as rm

    monkeypatch.setattr(rm, "RAWS_DIR", tmp_path / "raws")
    monkeypatch.setattr(rm, "SLICED_DIR", tmp_path / "sliced")

    rows = parse_models_md(SAMPLE_MODELS_MD)
    floor, evidence = evidence_floor(rows[0], print_log_text="Printed the Bamboo Dragon (print-in-place) today, came out great.")
    assert floor == "🖨️"


def test_evidence_floor_never_exceeds_evidence(tmp_path, monkeypatch):
    import scripts.reconcile_models as rm

    monkeypatch.setattr(rm, "RAWS_DIR", tmp_path / "raws")
    monkeypatch.setattr(rm, "SLICED_DIR", tmp_path / "sliced")

    rows = parse_models_md(SAMPLE_MODELS_MD)
    floor, evidence = evidence_floor(rows[0], print_log_text="")
    assert floor == "⬜"
    assert evidence == []


def test_reconcile_only_flags_forward_changes(tmp_path, monkeypatch):
    import scripts.reconcile_models as rm

    monkeypatch.setattr(rm, "RAWS_DIR", tmp_path / "raws")
    monkeypatch.setattr(rm, "SLICED_DIR", tmp_path / "sliced")
    (tmp_path / "raws" / "kids-toys").mkdir(parents=True)
    (tmp_path / "raws" / "kids-toys" / "154224-bamboo-dragon.3mf").write_text("x")

    rows, changes = reconcile(SAMPLE_MODELS_MD, print_log_text="")
    assert len(changes) == 1
    row, old, new = changes[0]
    assert row.title == "Bamboo Dragon (print-in-place)"
    assert old == "⬜"
    assert new == "✅"
    # Second row is already at ✅ with no further evidence -> not flagged.
    assert all(c[0].title != "Flexi Baby Axolotl" for c in changes)


def test_apply_changes_rewrites_only_status_cell():
    rows = parse_models_md(SAMPLE_MODELS_MD)
    row = rows[0]
    changes = [(row, "⬜", "✅")]
    updated = apply_changes(SAMPLE_MODELS_MD, changes)
    assert "| Bamboo Dragon (print-in-place) | Cinderwing3D x BambuLab | Personal | ✅ |" in updated
    # Untouched row still has its original status.
    assert "| Flexi Baby Axolotl | MakerWorld | Personal | ✅ |" in updated
