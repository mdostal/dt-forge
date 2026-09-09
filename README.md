# dostal-3d-printing

Operational workspace for the Bambu X1C — the actual print jobs: source models, sliced files, plate profiles, and the licensing log for anything we might sell prints of.

> This is the **shop-floor** repo. Model *creation / tooling* (AI-3D, CAD, photo-to-3D, drone-to-model) lives in a separate repo: [`../model-forge`](../model-forge).

## Layout

```
raws/            # downloaded model files (STL / .3mf) — NOT committed (see licensing note)
  kids-toys/       Clarabel's first prints
  printer-tools/   poop chute, scrapers, printer QoL
  functional/      brackets, organizers, replacement parts
sliced/          # Bambu Studio output (.gcode.3mf) — NOT committed, copy these to the SD/printer
plate-profiles/  # exported slicer profiles per plate/material
MODELS.md        # the manifest: every model, its source, creator, license, intended use
print-log.md     # what got printed, settings, and how it came out
```

## ⚠️ Why `raws/` and `sliced/` are git-ignored

Most MakerWorld / Printables / Thingiverse models are **personal-print-only** (MakerWorld's default license). Committing those `.stl`/`.3mf` files into a git repo — especially one that could ever go public — is **redistribution**, which the license forbids.

So we track the **structure and the manifest**, not the model binaries. Drop the downloaded files into `raws/` locally; they stay on your disk, off git. Models we *own* (generated in `model-forge` or bought with a commercial license) are the exception — those can be committed, in their own `owned/` folder, once we have them.

## The flow

1. Pull a model → drop it in the right `raws/` subfolder.
2. Log it in `MODELS.md` (source, creator, license, use).
3. Slice in Bambu Studio (textured PEI plate, AMS colors) → save `.gcode.3mf` to `sliced/`.
4. Send over WiFi **or** copy to the SD card (`/Volumes/BAMBU`).
5. Print → jot the result in `print-log.md`.
6. (Optional) Run `python3 scripts/reconcile_models.py` to check `MODELS.md`'s
   status column against what's actually in `raws/`, `sliced/`, and
   `print-log.md`. Add `--apply` to write the corrections. It only ever moves
   a status forward (⬜→✅→🎚️→🖨️), never back.
