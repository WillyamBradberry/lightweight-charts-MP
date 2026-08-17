# MP Spec-Matrix Orchestrator (CLI)

CLI-оркестратор для Spec-First разработки с локальными моделями (Qwen 16–60k, LM Studio, Cline/Continue).

## Зачем это нужно

Локальные модели с окном 16–60k **не видят** большой проект целиком.  
Классический RAG по кускам кода часто приводит к галлюцинациям и поломке зависимостей.

Решение:
1. Один раз (или инкрементально) строим **Project Matrix** — компактный цифровой двойник.
2. Спецификации и таски становятся источником истины.
3. При каждой таске CLI выдаёт **узкий context pack** (matrix slice + spec + нужные файлы ≤ лимита).
4. Агенты работают только с этим pack → меньше зацикливаний и ошибок.

## Стек (рекомендуемый)

- Python 3.11+
- ChromaDB (локальная векторная БД)
- tree-sitter / ast (для Python/JS/TS парсинга)
- Rich / Typer (красивый CLI)
- Опционально: sentence-transformers или просто hash-based semantic tags (чтобы не тянуть тяжёлые embeddings на 3090)

## Основные команды (целевой API)

```bash
# 1. Инициализация / полный скан (делается редко)
mp-matrix init --root libs/MP-charts-toolkit
mp-matrix scan --full

# 2. Инкрементальное обновление после правок
mp-matrix scan --changed

# 3. Статус и верификация
mp-matrix status
mp-matrix verify

# 4. Получить context pack для таски
mp-matrix pack --entities entity-id-1,entity-id-2 --spec docs/specs/xxx.md --max-tokens 12000

# 5. Создать slice для модуля
mp-matrix slice --module ChartComponent

# 6. Поиск по semantic hash / смыслу
mp-matrix search "render candlestick with volume"
```

## Как это встраивается в твой workflow (VSCode + Cline + LM Studio)

1. LM Studio запущен как OpenAI-compatible server.
2. Cline / Continue смотрит в workspace (лучше открывать `libs/MP-charts-toolkit` как root, если работаешь только с ним).
3. Правила (.clinerules) уже Spec-First.
4. Перед сложной работой:
   ```bash
   mp-matrix pack --task "добавить non-sticky drawing" --max-tokens 18000 > .context/current-pack.md
   ```
5. В Cline: "Используй context pack из .context/current-pack.md и выполни task ..."
6. После таски — `mp-matrix scan --changed` (или автоматически через git hook / post-task script).

## Разница Python vs TypeScript/Go для CLI

| Критерий              | Python                          | TypeScript / Go                  |
|-----------------------|---------------------------------|----------------------------------|
| Скорость разработки   | Отличная (ты уже на Python)     | TS — хорошо, Go — быстрее runtime|
| Chroma / embeddings   | Нативно и просто                | Нужны биндинги                   |
| tree-sitter           | Есть                            | Есть                             |
| Распространение       | `pip install -e .` или uv       | npm / single binary (Go)         |
| Твой стек             | Основной                        | JS/TS тоже много                 |

**Рекомендация**: писать CLI на **Python**.  
Это самый быстрый путь, легко интегрируется с Chroma, и ты уже в экосистеме.  
Позже можно сделать тонкий TS-wrapper если понадобится внутри Node-инструментов.

## Температура и настройки

Оркестратор может выводить рекомендацию:

```json
{
  "task_type": "coding",
  "temperature": 0.15,
  "top_p": 0.8,
  "max_tokens": 8192,
  "context_pack": "..."
}
```

Cline/Continue + LM Studio позволяют задавать эти параметры per-request или через config.

## Структура хранения

```
megaproject/
├── matrix/
│   ├── project-matrix.json      # или .jsonl
│   ├── chroma/                  # локальная БД
│   └── slices/
│       └── MP-charts-toolkit.json
├── docs/
│   ├── specs/
│   ├── plans/
│   └── tasks/
├── memory-bank/
└── libs/MP-charts-toolkit/
    └── (можно иметь локальный matrix/slice)
```

## Следующие шаги (для нас с тобой)

1. Утвердить эти правила (уже переформатированы).
2. Написать скелет CLI (`typer` + базовый scanner на ast/tree-sitter).
3. Сделать первую версию Entity Map + Semantic Hash для `libs/MP-charts-toolkit`.
4. Добавить команду `pack`.
5. Написать полный newbie-friendly README с примерами промптов.

Готов начать кодить CLI?