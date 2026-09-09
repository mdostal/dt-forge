# Horizontal Plan — ai-toolset-foundations

Condensed per the rolling-wave scope decision (design-discussion §6) — layers, not full architecture spec.

| Layer | Touches | Story |
|---|---|---|
| Manifest/data | `MODELS.md`, `raws/`, `sliced/` | models-md-automation |
| Printer integration | New adapter module (LAN mode: MQTT status + file push to onboard storage) | printer-agent-link |
| App shell | New app project (framework decided in-story), Portunus (secrets), Heimdall (LLM routing) | byok-app-shell |
| Static site | New GitHub Pages project structure + GH Actions | github-pages-showcase |
| Planning meta | `.pHive/epics/` (next epic, not yet created) | plan-next-toolset-slice |

No shared cross-layer dependencies except the hand-off story, which reads the outcome of all four to scope the next plan.
