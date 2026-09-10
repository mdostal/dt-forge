# Project CONTEXT

Shop-floor workspace for the Bambu X1C, evolving into an AI-assisted toolset for capturing, reverse-engineering, and print-prepping 3D models — plus a future GitHub Pages showcase and BYOK installable app built on top of it.

## Terminology

- **raws/** — downloaded model files (STL/3mf), git-ignored. Subfolders: `kids-toys/`, `printer-tools/`, `functional/`. Personal-print-only license by default (MakerWorld).
- **sliced/** — Bambu Studio slicer output (`.gcode.3mf`), git-ignored; copied to the printer/SD card, never committed.
- **plate-profiles/** — exported slicer profiles per plate/material combo.
- **owned/** — reserved subfolder (not yet created) for models we can legally commit and sell prints of: self-modeled in `model-forge`, or bought with a commercial license.
- **MODELS.md** — the manifest of record: every model, its source, creator, license, and status. This is what keeps the project honest if prints are ever sold.
- **print-log.md** — history of actual print runs and settings/outcomes.
- **model-forge** — sibling repo (`../model-forge`) that owns model *creation/tooling*: AI-3D, CAD, photo-to-3D, drone-to-model. This repo is the operational/shop-floor half; model-forge is the creation half.
- **BYOK** — "bring your own key/subscription." The planned installable app lets a user supply their own LLM key rather than the project hosting a shared backend.
- **the studio** — planned chat-based workspace where a user iterates on a generated model with an agent (tweak, discuss, regenerate) rather than a one-shot generation.
- **Status legend** (MODELS.md) — ⬜ to pull · ✅ in raws · 🎚️ sliced · 🖨️ printed.

- **knowledge-base/** — structured catalog of adjacent tools/slicer-forks/algorithms (e.g. WaveOverhangs) worth tracking for this toolset. `entries.yaml` is the machine-readable source; `README.md` is the human index. Add an entry whenever a relevant external tool comes up rather than letting it live only in chat history.

## Key paths

- `MODELS.md` — model manifest; update status emoji as a model moves through the pipeline.
- `print-log.md` — append print results/settings here after each print.
- `raws/`, `sliced/`, `plate-profiles/` — local working directories; the first two are git-ignored (see README licensing note).

## Conventions

- Never commit files under `raws/` or `sliced/` unless the model is legally ours (self-modeled or commercially licensed) — those go in `owned/` instead. See README "Why raws/ and sliced/ are git-ignored".
- `MODELS.md` is the single source of truth for licensing status; don't let it drift from what's actually on disk.

## Canonical references

- [README.md](../README.md) — full repo layout and the pull → log → slice → print → log flow.
- [MODELS.md](../MODELS.md) — model manifest schema and licensing legend.
- `.pHive/project-profile.yaml` → `north_star` — the broader AI-assisted toolset direction agreed at kickoff (2026-09-08).
