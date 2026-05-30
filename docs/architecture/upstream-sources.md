# Upstream Sources

## lightweight-charts

Source:
https://github.com/tradingview/lightweight-charts

Purpose:
Rendering engine and primitive APIs.

---

## lightweight-charts-line-tools

Source:
https://github.com/difurious/lightweight-charts-line-tools

Purpose:
Reference implementation for drawing tools.

Status:

* legacy architecture
* uses private APIs
* partially coupled to old lightweight-charts internals

Policy:

* use as reference only
* avoid direct architectural copying
* gradually adapt concepts into toolkit plugin runtime
