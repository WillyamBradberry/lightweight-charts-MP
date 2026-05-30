# Documentation Rules

## Purpose

Documentation exists to help AI agents and humans navigate the subsystem quickly.

---

# Rules

## Create new feature docs ONLY when:

* feature has isolated responsibility
* feature contains multiple files/modules
* feature exposes public API
* feature may be modified independently

---

## Do NOT create docs for:

* trivial utilities
* single helper functions
* temporary experiments
* internal constants

---

# Naming

Use:

* kebab-case
* subsystem-oriented naming

Examples:

* crosshair-sync.md
* toolbar-system.md
* pane-management.md

Avoid:

* misc.md
* helpers.md
* stuff.md

---

# File Size

Preferred:

* 50-300 lines

Avoid:

* giant documentation dumps

---

# Every feature doc should contain

## Purpose

## Main files

## Public API

## Internal dependencies

## Safe modification zones

## Known risks

---

# AI Refactor Policy

When refactoring:

* update related docs
* preserve subsystem boundaries
* avoid undocumented side effects
