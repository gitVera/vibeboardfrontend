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
- `priority text` — `low | medium | high`
- `status text` — `todo | in_progress | done`
- `position int` — порядок внутри колонки
- `created_at timestamptz`
- `updated_at timestamptz`

Связь: одна доска (`boards`) имеет много задач (`tasks`).

## RLS

Включен RLS на обеих таблицах.

- Пользователь видит и изменяет только свои доски (`boards.owner_id = auth.uid()`).
- Доступ к задачам разрешен только если задача относится к доске текущего пользователя.

## Фронтенд-слой

- API для CRUD: `src/lib/boardsApi.ts`
- Типы: `src/types/boards.ts`
- UI страницы: `src/pages/BoardsPageConnected.tsx`
- Экспорт страницы: `src/pages/BoardsPage.tsx`

## Текущее поведение UI

На `/boards` доступны:

- CRUD досок: создать, открыть, посмотреть, изменить, удалить
- CRUD задач: создать, посмотреть, изменить, удалить
- Разбиение задач по колонкам: `To Do`, `In Progress`, `Done`

Все эти действия уже выполняются через реальные запросы в Supabase.

