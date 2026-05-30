Generated `libs/MP-charts-toolkit/docs/refactor/plugin-decomposition-plan.md` — a comprehensive decomposition plan for the 6,495-line `line-tools.js` plugin.

**Document contents:**

1. **Executive Summary** with key metrics (6,495 lines total, ~6,138 extractable, ~357 to delete)
2. **Target folder structure** — 12 subsystems across ~10 folders under `src/plugins/line-tools/`
3. **Subsystem Analysis** for all 12 subsystems with:
   - Source line ranges and class/function mappings
   - Estimated extracted line counts per file
   - Dependency analysis
   - TypeScript public interfaces (code blocks)
   - Extraction difficulty (LOW/MEDIUM/HIGH)
   - TypeScript migration difficulty

4. **Upstream Comparison Analysis** — three tables:
   - Code already in `lightweight-charts-line-tools-core` to reuse as-is
   - MP-UNIQUE components not found upstream
   - Code recommended for DELETION (upstream-provided or redundant)

5. **Migration Priority Matrix** (P0→P7 phases)
6. **Phase-by-phase Migration Strategy** with file lists
7. **Rollout Order Summary** — 17 steps
8. **Risk Assessment** with severity and mitigation strategies

**MP-UNIQUE components identified:** alerts, navigation toolbar, callout badges, dt alert checker, long-short position tool, price-range visualizer, template system (7 unique subsystems)

**Upstream-provided to reuse:** event emitter H class, coordinate mapping T function, basic renderers si/li/ci/pi, style injection utilities, LineToolType enum, createLineToolsPlugin factory