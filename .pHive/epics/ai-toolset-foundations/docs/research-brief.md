# Research Brief — ai-toolset-foundations

## Codebase state
- `dostal-3d-printing` has no application code yet: a README, `MODELS.md` manifest, `print-log.md`, and `plate-profiles/`. `raws/` and `sliced/` are git-ignored (personal-print-only licensing).
- Bambu X1C is the target printer. README's flow: pull model → log in MODELS.md → slice in Bambu Studio → send over WiFi or SD → print → log result.
- No GitHub Pages site, no app shell, no printer-integration code exists in this repo today.

## Sibling repo: model-forge (`../model-forge`)
- Owns model *creation* tooling: AI-3D (Meshy Pro), parametric CAD (Onshape/OpenSCAD), photogrammetry, drone-to-model.
- `ROADMAP.md` is explicitly framed as "the Hive target" and already covers: `bracket-gen` (measurements → STL), a measurement-intake CLI, photogrammetry cleanup (`scan-clean`), a Meshy prompt/image → model wrapper with licensing provenance, and drone → house-model.
- Two real projects already started: `furniture-brackets`, `playset-bracket`.
- **Scope boundary (confirmed with user):** this epic does NOT re-plan model-forge's capture/CAD/photogrammetry pipeline. That gets planned separately, in that repo, in a future session.

## Available integrations (session-level, per kickoff)
- **Heimdall** (MCP, connected) — AI provider/lane routing. Intended per the user's stated direction to route LLM calls in the future BYOK app, mirroring gigradar's dogfooding pattern.
- **Portunus** (MCP, connected) — secret/key vault. Intended for BYOK key storage/retrieval in the app.
- Bambu X1C connectivity: the printer supports LAN-mode local MQTT (port 8883, TLS) and an HTTP-ish local API for AMS/job status on recent firmware; also reachable via Bambu Cloud API when cloud-bound. No prior integration exists in this repo — this is new ground.
- GitHub Pages: user has existing "mdostal GitHub Pages" projects as the pattern to match (static site + GH Actions deploy) — no existing template found in this workspace to reuse directly; treat as net-new scaffold following that established personal convention.

## Confirmed epic scope (from kickoff + planning conversation)
Four areas, each planned as its own vertical slice, all landing in `dostal-3d-printing`:
1. **Printer-agent link** — let an agent query/control the Bambu X1C (status, AMS state, start/stop) — the genuinely shop-floor-facing piece.
2. **GitHub Pages showcase site** — public page for the project, matching other mdostal GitHub Pages.
3. **BYOK installable app + chat studio shell** — app shell with bring-your-own-key LLM access (Heimdall) and secret storage (Portunus); the full chat "studio" and model-generation wiring is a later slice that calls into model-forge's tooling.
4. **MODELS.md automation** — script/CLI to keep the manifest's status column honest as models move raws → sliced → printed.

Plus a closing hand-off story so the epic ends by queuing the next planning pass rather than trying to plan the entire long-horizon vision in one shot.

## Risks surfaced during research
- Bambu X1C's local API/MQTT is not officially documented by Bambu Lab for third-party use; community reverse-engineering (e.g. bambulabs_api, homeassistant-bambulab) is the realistic reference, and firmware updates have broken such integrations before.
- Attempting deep BYOK/chat-studio work before model-forge's own pipeline stories exist risks building UI for capabilities that don't exist yet — this epic scopes the app slice to shell + BYOK key management only, not the studio's model-generation calls.
- GitHub Pages scope is undefined beyond "matches the pattern of other mdostal pages" — no content brief exists yet.
