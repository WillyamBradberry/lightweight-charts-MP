# MP Charts Toolkit — AI Index

## Purpose

Trading/charting UI toolkit based on lightweight-charts.

Used as embeddable module inside megaproject.

---

# MAIN ENTRY POINTS

## Application

* src/main.ts
* src/App.tsx

## Chart System

* src/chart/

## UI

* src/components/
* src/layout/

## State

* src/store/

---

# PRIMARY SYSTEMS

## Chart creation

Search:

* createChart(
* IChartApi

## Series management

Search:

* addSeries
* CandlestickSeries
* LineSeries

## Toolbar

Search:

* toolbar
* icon
* button

## Indicators

Search:

* indicator
* overlay

## Theme system

Search:

* theme
* colors
* layout

---

# SAFE REFACTOR RULES

* Never mix chart logic into React UI components
* Move business logic into services
* Keep files under ~700 LOC
* Prefer facade APIs
* Avoid circular imports

---

# COMMON MODIFICATION TASKS

## Change toolbar icons

Search:

* src/components
* icon
* toolbar

## Add watermark

Search:

* createTextWatermark
* chart.panes()

## Modify chart theme

Search:

* applyOptions
* layout
* grid

## Add overlays

Search:

* priceLine
* primitive
* overlay

---

# AI WORKFLOW

1. Read AI_INDEX.md
2. Read related architecture docs
3. Touch minimal amount of files
4. Avoid cross-module rewrites
5. Prefer isolated feature modules
