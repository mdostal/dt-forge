# Design Discussion — ai-toolset-foundations

## §0 Prelude

**NORTH STAR** (from `.pHive/project-profile.yaml`, captured at kickoff 2026-09-08):
- Goal: framework/toolset for AI-assisted 3D model capture and print-prep, wrapped in a GitHub Pages showcase + BYOK installable app, dogfooding Heimdall + Portunus.
- Audience: personal/household now, public showcase for other makers later.
- Scale: single user; BYOK means no shared backend load.
- Pain points: manual MODELS.md tracking; need AI assist for reverse-engineering/design/rough-drafting.

No prior KG decisions found for this topic (fresh project, first epic).

## §1 Goal

Lay foundations for four areas that together turn `dostal-3d-printing` from a manifest-only shop-floor repo into the operational + showcase half of an AI-assisted maker toolset, without re-planning model-forge's own capture/CAD pipeline (out of scope here — confirmed with user):

1. Printer-agent link (Bambu X1C status/control from an agent)
2. GitHub Pages showcase site
3. BYOK installable app shell (Heimdall + Portunus wiring, no studio/model-gen yet)
4. MODELS.md status automation

This is explicitly a **rolling-wave foundations epic**: each area gets planned and built to a first working slice, not to completion, and the epic closes with a hand-off story that queues the next planning pass — matching the user's request to "break down and plan out what we can... leave a high level task at the end of an epic to plan the next."

## §2 Proposed Approach

Four independent-ish vertical slices, each producing a genuinely working state on its own, sequenced by risk/uncertainty (highest-uncertainty first, so later slices benefit from what we learn):

1. **MODELS.md automation** (lowest risk, most contained) — a small script that scans `raws/` and `sliced/` and reconciles status emoji in `MODELS.md` against what's actually on disk, run manually for now (no watcher/hook yet).
2. **Printer-agent link** (highest technical uncertainty — undocumented local API) — start read-only: agent can query printer/AMS/job status over LAN mode. Control (start/stop) is explicitly deferred to a follow-on slice once read-only is proven reliable.
3. **BYOK app shell** — a minimal installable app shell (framework TBD by the team at implementation time) with a settings screen for BYOK key entry, wired through Portunus for storage and Heimdall for routing a trivial "test call" — no chat studio, no model generation yet. Proves the dogfooding wiring works end-to-end on the smallest possible surface.
4. **GitHub Pages showcase scaffold** — static site scaffold + GH Actions deploy, placeholder content describing the project; matches the "other mdostal GitHub Pages" convention. Lowest technical risk, mostly content/structure work.
5. **Hand-off: plan next toolset slice** — closes the epic by re-invoking `/plugin-hive:plan` scoped to whichever area most needs deepening next (likely: printer control, or the chat studio wired to model-forge).

## §3 Risks

| Severity | Risk | Mitigation |
|---|---|---|
| High | Bambu X1C local API is unofficial/reverse-engineered; firmware updates can break it | Read-only first; isolate the integration behind a thin adapter so breakage is contained to one module |
| Medium | BYOK app shell built before model-forge has anything to call risks premature UI | Scope this slice to shell + key management only; explicitly defer studio/model-gen wiring |
| Low | GitHub Pages content brief doesn't exist yet | Scaffold + placeholder content only in this slice; a content pass is a later story |
| Low | Four parallel-ish areas in one epic risks losing focus | Sequenced by risk, each slice independently shippable, hand-off story forces a deliberate re-plan rather than silent scope creep |

## §4 Dependencies

- MODELS.md automation: none.
- Printer-agent link: none (new integration).
- BYOK app shell: Heimdall + Portunus already connected at session level; no new external dependency, but needs an app scaffold decision (framework choice happens inside the story).
- GitHub Pages scaffold: none.
- Hand-off story: depends on the four slices above landing (or being deliberately deferred) so the next plan has real signal to work from.

## §5 Open Questions

1. **RESOLVED** — Printer control scope: read-only status/AMS/job-state this epic, PLUS the ability to send/queue a sliced file to the printer (push to onboard storage) so a human can start it, or explicitly queue a task for a human to pick up in Bambu Studio. Autonomous start/stop/pause control is deferred to a follow-on slice.
2. **App shell framework** — no framework chosen yet (Electron/Tauri/web-wrapped?). Recommendation: decide inside the BYOK app shell story once we know target platforms (Mac only? Cross-platform?).
3. **GitHub Pages content** — is a placeholder/"coming soon" page acceptable for this slice, or is real showcase copy needed now? (Recommendation: placeholder now, content is a fast follow.)

## §6 Scale Assessment

**Large** — multi-system (printer integration, static site + CI, installable app with secrets/LLM routing, manifest automation), long-horizon, explicitly framed by the user as a rolling-wave backlog rather than a single bounded delivery.

Given the user's explicit preference for a lighter, iterative rolling-wave approach over the full large-scope ceremony (structured outline with elicitation), this epic uses a condensed horizontal/vertical plan and skips the full ~1000-line structured outline — each slice is scoped to "first working state," not full delivery, and the hand-off story is the mechanism that keeps deeper planning honest rather than trying to front-load it all now.
