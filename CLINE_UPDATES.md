# Spec-First Restructure for Megaproject (Local Models Friendly)

Дружеская командная работа → делаем полезный инструмент для коммьюнити, которое сидит на локальных моделях (Qwen + LM Studio + Cline/Continue) и устало от потери контекста.

## Что изменилось

- Правила переписаны максимально лаконично: только **DO / DON'T**.
- Skills (`.agents`) — на английском, короткие и чёткие.
- Добавлен skill `matrix` и жёсткая привязка к Project Matrix.
- Memory-bank: гибрид (локальный + глобальный).

## Структура

```
megaproject/
├── .clinerules/rules/          ← короткие правила (DO/DON'T)
├── .agents/skills/             ← skills на английском
├── matrix/                     ← Project Matrix + slices + Chroma
├── memory-bank/                ← глобальный (кросс-модульные ADR)
├── docs/specs/
└── libs/
    └── MP-charts-toolkit/
        ├── memory-bank/        ← локальный (activeContext, progress, patterns)
        ├── docs/specs/
        └── matrix/slices/      ← опционально
```

## Memory-bank: где жить?

**Решение: гибрид.**

- **Локальный** (`libs/<module>/memory-bank/`) — основной для ежедневной работы.
  - `activeContext.md`, local progress, local systemPatterns, local decisions.
  - Когда работаешь над одним модулем — контекст остаётся маленьким.
- **Глобальный** (корень `memory-bank/`) — только для:
  - кросс-модульных решений
  - высокого уровня Project Matrix overview
  - shared ADRs

Правило: при работе над `MP-charts-toolkit` используй его локальный memory-bank.  
activeContext всегда ≤ 1.5k токенов и очищается после каждой таски.

## Как использовать прямо сейчас

1. Скопируй `.clinerules/` и `.agents/` в свой проект.
2. Создай `libs/MP-charts-toolkit/memory-bank/` и положи туда `activeContext.md`.
3. Work Dir указывай в activeContext.
4. Перед любой фичей — сначала `spec-write`.
5. Код пишется только после утверждённого checklist.

## Следующие шаги

- [x] Правила сжаты + skills на английском
- [x] Решение по memory-bank зафиксировано
- [ ] Скелет CLI `mp-matrix` (Python + Chroma)
- [ ] Первый Entity Map по `libs/MP-charts-toolkit`
- [ ] Команда `pack` + newbie README с примерами промптов

Готов продолжать — скажи, что правим дальше или сразу пишем CLI.