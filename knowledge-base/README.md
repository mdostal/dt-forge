# Knowledge Base

Adjacent tools, slicer forks, and algorithms worth tracking for this toolset — things like WaveOverhangs (overhang-printing algorithms for OrcaSlicer). The goal: when something like this comes up, it gets a real entry instead of getting lost in chat — so it can be fetched, checked, and eventually evaluated or prototyped against.

**Structured data lives in [`entries.yaml`](entries.yaml)**, not just here — that's what a future agent/tool should read to answer "what do we know about X" or "what's relevant to overhang printing." This file is the human-readable index.

## Entries

| Entry | Type | Status | Relevant to |
|---|---|---|---|
| [WaveOverhangs](entries.yaml) | slicer-fork | reference | print-quality, overhangs, printer-agent-link |

## Status legend

- **reference** — logged, not yet evaluated against real hardware/prints.
- **evaluating** — actively being researched/tested.
- **testing** — installed and running a real trial.
- **integrated** — actually wired into the toolset.

## Adding an entry

Append to `entries.yaml` following the schema comment at the top of that file. Always cite real sources (`sources: []`) — this knowledge base is only useful if its claims are verifiable, not guessed. If you're not sure a detail is accurate, verify it (web search, the project's own README) before writing it down here.
