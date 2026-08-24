# Active Context — MP-charts-toolkit (Local)

## Status
Memory Bank initialized. Ready for next task.

## Work Dir
`libs/MP-charts-toolkit`

## Current State
- Branch: inherited from parent repo `MPC-refactoring`
- Dirty working tree — uncommitted changes in submodules and files
- Build system: Vite 7 (npm run build)
- Key libraries: lightweight-charts v4/v5, React 19, lucide-react

## Active Context
- Spec-first workflow active — skill manifests carry exact file maps + sources of truth.
- Last meta-task: spec-first orchestration without mp-matrix (ADR-2026-08-20).
- Line tools core adapter path is functional (non-sticky drawing, floating toolbar).
- **NEW (2026-08-20): Navigation map generated** — `CODEMAP.md` (root) + `docs/architecture/ARCHITECTURE.md` created from live code scan. Documents actual `USE_CORE_LINE_TOOLS=true` (project-matrix.md stale/false), packages map, plugin system, and critical paths. Docs-only change; no .ts/.jsx edited.
- **NEW (2026-08-20): Per-module maps** — `docs/architecture/maps/` created for 5 complex modules (>5 files): line-tools-core, line-tools-lines, chart-engine, src-utils, toolbar. Modules with ≤5 files (line-tools-rectangle, line-tools-core-adapter) skipped. CODEMAP.md + ARCHITECTURE.md updated with map index.

## Sources of Truth
- Global `memory-bank/`: systemPatterns.md, techContext.md, decisionLog.md, progress.md
- Local `libs/MP-charts-toolkit/memory-bank/`: activeContext.md, systemPatterns.md
- `.agents/skills/<skill>/SKILL.md` — skill manifests

## Next Steps
Awaiting task from Главнокомандующий. Ready to classify → scope → dispatch via orchestrator.

