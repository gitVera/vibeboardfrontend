# Boards и Tasks (Supabase)

Документация по сущностям досок и задач, которые используются на странице `/boards`.

## Сущности

### `public.boards`

- `id uuid` — идентификатор доски
- `owner_id uuid` — пользователь-владелец (`auth.users.id`)
- `name text` — название доски
- `description text` — описание доски
- `owner_label text` — отображаемое имя владельца/команды в UI
- `created_at timestamptz`
- `updated_at timestamptz`

### `public.tasks`

- `id uuid` — идентификатор задачи
- `board_id uuid` — ссылка на доску (`public.boards.id`)
- `title text` — название задачи
- `description text` — описание задачи
- `owner_label text` — исполнитель в UI
- `deadline_at date | null` — дата, к которой нужно выполнить задачу
- `column_id uuid` — ссылка на колонку задачи (`public.board_columns.id`)
- `priority text` — `low | medium | high`
- `status text` — legacy-статус для обратной совместимости (`todo | in_progress | in_review | done`)
- `position int` — порядок внутри колонки
- `created_at timestamptz`
- `updated_at timestamptz`

Связь: одна доска (`boards`) имеет много задач (`tasks`).

### `public.board_columns`

- `id uuid` — идентификатор колонки
- `board_id uuid` — ссылка на доску (`public.boards.id`)
- `key text` — технический ключ колонки
- `title text` — отображаемое название
- `position int` — порядок колонки на доске
- `is_system boolean` — признак системной колонки
- `created_at timestamptz`
- `updated_at timestamptz`

### `public.board_members`

- `board_id uuid` — ссылка на доску (`public.boards.id`)
- `user_id uuid` — пользователь с доступом (`auth.users.id`)
- `added_by uuid | null` — кто выдал доступ
- `created_at timestamptz`

Первичный ключ: (`board_id`, `user_id`).

## RLS

Включен RLS на таблицах досок, задач, участников и колонок.

- Доступ к доскам и задачам есть у владельца и у участников доски.
- Доступ к участникам доски (`board_members`) ограничен пользователями, у которых уже есть доступ к доске.
- Доступ к колонкам (`board_columns`) ограничен тем же правилом `user_has_board_access(board_id)`.

## Фронтенд-слой

- API для CRUD: `src/lib/boardsApi.ts`
- Типы: `src/types/boards.ts`
- UI страницы: `src/pages/BoardsPageConnected.tsx`
- Экспорт страницы: `src/pages/BoardsPage.tsx`

## Текущее поведение UI

На `/boards` доступны:

- CRUD досок: создать, открыть, посмотреть, изменить, удалить
- CRUD задач: создать, посмотреть, изменить, удалить
- Динамические колонки доски (из БД), включая базовые `To Do`, `In Progress`, `In Review`, `Done`
- Перетаскивание задач между колонками (нативный HTML5 DnD)
- CRUD колонок:
  - создание через `+ Колонка`
  - переименование по клику на заголовок колонки
  - удаление из модалки редактирования (для `To Do` удаление запрещено)
- При удалении колонки задачи автоматически переносятся в `To Do`
- Выбор исполнителя для задачи:
  - из пользователей с доступом к доске
  - или `Не назначено`
- Поле даты `Выполнить к` при создании и редактировании задачи
- Цвет дедлайна:
  - красный, если дата уже прошла
  - зеленый, если срок еще не наступил (включая сегодня)

Все эти действия уже выполняются через реальные запросы в Supabase.

Дополнительно см. пользовательский поток: `docs/tasks-workflow.md`.

