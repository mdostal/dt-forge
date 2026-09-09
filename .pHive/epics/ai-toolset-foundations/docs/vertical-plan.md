# Vertical Plan — ai-toolset-foundations

Sequenced by risk/uncertainty (design-discussion §2). Each slice below is a complete, independently working state.

1. **models-md-automation** — run a script → MODELS.md status column matches disk reality. Working state: manifest is trustworthy without manual editing.
2. **printer-agent-link** — agent queries the X1C's status/AMS/job state over LAN and can push a sliced file to it for a human to start. Working state: an agent can check the printer and hand a human a queued job.
3. **byok-app-shell** — installable app shell opens, accepts a user's key via Portunus, makes one trivial routed call via Heimdall. Working state: BYOK wiring proven end-to-end on a minimal surface.
4. **github-pages-showcase** — static site scaffold live via GH Actions with placeholder content. Working state: a public URL exists describing the project.
5. **plan-next-toolset-slice** — re-invoke `/plugin-hive:plan` scoped to the next area (recommend: printer control, or wiring the app shell's studio to model-forge). Working state: the backlog has a concrete next epic queued, not an open-ended "someday."

Each slice depends only on itself; slice 5 depends on 1–4 landing (or being explicitly deferred with a reason) so the next plan has real signal.
