# AlertAdapter Migration Report

## Summary

Created `AlertAdapter` class that encapsulates all direct `_userPriceAlerts` access from the vendored `lightweight-charts-line-tools@4.1.1` plugin. The adapter is the single bridge between the shell and the plugin's private alert primitive.

## Files Changed

| File | Change | Lines Affected |
|---|---|---|
| `src/plugins/line-tools-adapter/AlertAdapter.js` | **Created** — new adapter class | +142 |
| `src/components/Chart/ChartComponent.jsx` | **Modified** — replaced 13 direct `_userPriceAlerts` accesses with adapter | -63 / +35 |

## What Was Removed

### Direct `_userPriceAlerts` Property Access

| Location | Lines (old) | Pattern Removed | Calls |
|---|---|---|---|
| `addPriceAlert()` | 174-203 | `manager._userPriceAlerts` + `setSymbolName()` + `addAlertWithCondition()` + `openEditDialog()` | 4 |
| `removePriceAlert()` | 205-216 | `manager._userPriceAlerts` + `removeAlert()` | 2 |
| `restartPriceAlert()` | 218-233 | `manager._userPriceAlerts` + `addAlertWithCondition()` | 2 |
| `initializeLineTools()` | 787-830 | `manager._userPriceAlerts` + `setSymbolName()` + `alertsChanged().subscribe()` + `alertTriggered().subscribe()` + `alerts()` | 5 |
| **Total** | | | **13** |

### What Was Added

| Location | Lines (new) | Pattern Added |
|---|---|---|
| Import | 16 | `import { AlertAdapter } from '../../plugins/line-tools-adapter/AlertAdapter'` |
| Ref declaration | 92 | `const alertAdapterRef = useRef(null);` |
| `addPriceAlert()` | 174-178 | `adapter.setSymbol(symbol)` + `adapter.create(alert.price, 'crossing')` |
| `removePriceAlert()` | 180-183 | `adapter.remove(externalId)` |
| `restartPriceAlert()` | 185-189 | `adapter.create(price, condition)` |
| `initializeLineTools()` | 740-771 | `new AlertAdapter(manager)` + `adapter.setSymbol()` + `adapter.onChange()` + `adapter.onTrigger()` + `adapter.getAll()` |

## AlertAdapter Public API

| Method | Signature | Purpose |
|---|---|---|
| `setSymbol(name)` | `(string) => void` | Set current symbol on alert primitive |
| `create(price, condition)` | `(number, string) => void` | Create alert without dialog |
| `remove(externalId)` | `(number\|string) => void` | Remove alert by external ID |
| `getAll()` | `() => Array<{id, price, condition, type}>` | Get all current alerts |
| `onChange(callback, context)` | `(fn, object) => SubscriptionHandle` | Subscribe to alert change events |
| `onTrigger(callback, context)` | `(fn, object) => SubscriptionHandle` | Subscribe to alert trigger events |

## Zero Behavior Change Verification

| Scenario | Before | After | Same? |
|---|---|---|---|
| Create alert via shell | `manager._userPriceAlerts.addAlertWithCondition(priceNum, 'crossing')` | `adapter.create(alert.price, 'crossing')` | ✅ Identical call chain |
| Create alert — fallback path | `userAlerts.openEditDialog(alert.id, {price, condition})` | `adapter.create()` → `_alerts.openEditDialog()` | ✅ Same fallback preserved |
| Remove alert | `userAlerts.removeAlert(externalId)` | `adapter.remove(externalId)` | ✅ Direct delegate |
| Restart alert | `userAlerts.addAlertWithCondition(priceNum, condition)` | `adapter.create(price, condition)` | ✅ Same create call |
| Set symbol on init | `userAlerts.setSymbolName(symbol)` | `adapter.setSymbol(symbol)` | ✅ Direct delegate |
| Subscribe to changes | `userAlerts.alertsChanged().subscribe(cb, manager)` | `adapter.onChange(cb, manager)` | ✅ Same subscription |
| Subscribe to triggers | `userAlerts.alertTriggered().subscribe(cb, manager)` | `adapter.onTrigger(cb, manager)` | ✅ Same subscription |
| Get alerts for mapping | `userAlerts.alerts()` | `adapter.getAll()` | ✅ Same return shape |
| Guard checks | `if (!userAlerts || !alert)` | `if (!adapter \|\| !alert)` | ✅ Same behavior |
| Number validation | `if (!Number.isFinite(priceNum)) return` | Inside `adapter.create()` | ✅ Same validation |
| try/catch safety | `console.warn('Failed to add...')` | `console.warn('AlertAdapter: Failed...')` | ✅ Same error handling |
| Plugin fallback (openEditDialog) | `typeof userAlerts.openEditDialog === 'function'` | Inside `adapter.create()` | ✅ Same detection |

## Build Verification

```
npm run build → ✓ Build passes (4.00s, 1741 modules transformed)
```

## Remaining Issues (Not in Scope)

| Issue | Location | Status |
|---|---|---|
| `window.lineToolManager` global | ChartComponent.jsx:775 | Still assigned — not part of alert scope |
| `window.chartInstance` / `window.seriesInstance` | ChartComponent.jsx:776-777 | Still assigned — not part of alert scope |
| Plugin's `chart._impl` access | line-tools.js (plugin internal) | Requires plugin fork — not addressable via adapter |
| Alert subscription memory leak on series re-creation | ChartComponent.jsx cleanup | Pre-existing issue — not addressed by this change |

## Next Steps

1. **Gate window globals** behind `if (process.env.NODE_ENV === 'development')` (4 hours)
2. **Define TypeScript interfaces** for alert event shapes in the adapter (2 hours)
3. **Rename `_source` to `source`** on alert objects in App.jsx (1 hour)
4. **Create ToolAdapter** for LineToolManager public methods (nice-to-have)
5. **Fork plugin source** to fix `chart._impl` access (requires external repo fork)

## File Structure

```
src/plugins/
├── line-tools/                  # Vendored plugin (unchanged)
│   ├── line-tools.js
│   ├── line-tools.css
│   ├── line-tools.d.ts
│   ├── line-tools.umd.cjs
│   └── package.json
└── line-tools-adapter/          # Adapter layer (NEW)
    └── AlertAdapter.js          # Encapsulates _userPriceAlerts access