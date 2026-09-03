# Аутентификация (Supabase Auth)

Документация по реализованному auth-потоку во frontend.

## Обзор

- **Backend:** Supabase Auth (email + password)
- **Профиль:** `name` и `role` сохраняются в `auth.users.user_metadata` при регистрации
- **UI:** модальное окно с вкладками «Вход» / «Регистрация», реактивный хедер по сессии

## Компоненты

### `AuthModal`

Файл: [`src/components/AuthModal.tsx`](../src/components/AuthModal.tsx)

| Вкладка | Поля | API |
|---------|------|-----|
| Вход | email, password | `supabase.auth.signInWithPassword` |
| Регистрация | имя, email, password, подтверждение пароля, роль | `supabase.auth.signUp` |

**Роли при регистрации (IT-команда):**

- Frontend Developer
- Backend Developer
- Fullstack Developer
- QA Engineer
- DevOps Engineer
- Product Manager
- UI/UX Designer
- Data Analyst

**Metadata при signUp:**

```typescript
options: {
  data: {
    name: string,
    role: string,
  },
}
```

**Валидация на клиенте:**

- все обязательные поля заполнены
- пароль ≥ 8 символов
- пароль и подтверждение совпадают
- роль выбрана

**UI-состояния:**

- `isSubmitting` — блокировка формы и текст «Входим...» / «Создаем аккаунт...»
- `errorMessage` — ошибки Supabase или валидации
- `successMessage` — если включено подтверждение email и сессия не создана сразу

### `App` (хедер)

Файл: [`src/App.tsx`](../src/App.tsx)

| Состояние | Хедер |
|-----------|-------|
| Гость | кнопки «Войти» и «Регистрация» |
| Авторизован | профиль (имя/email + аватар-инициал) + «Выйти» |

**Отображаемое имя:**

1. `session.user.user_metadata.name` (если непустое)
2. fallback: `session.user.email`

**Сессия:**

- начальная загрузка: `supabase.auth.getSession()`
- подписка: `supabase.auth.onAuthStateChange`
- выход: `supabase.auth.signOut()`

## Supabase client

Файл: [`src/lib/supabase.ts`](../src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
```

## Настройка окружения

1. Скопируйте `.env.example` → `.env.local`
2. Заполните переменные из Supabase Dashboard → Settings → API:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

`.env.local` не коммитится (см. `.gitignore` → `*.local`).

## Поток данных

```mermaid
sequenceDiagram
  participant User
  participant AuthModal
  participant Supabase
  participant App

  User->>AuthModal: submit login/register
  AuthModal->>Supabase: signInWithPassword / signUp
  Supabase-->>AuthModal: session or error
  AuthModal->>App: onClose (on success)
  Supabase->>App: onAuthStateChange
  App->>User: profile + logout in header
```

## Подтверждение email

Если в Supabase включено **Confirm email**, после регистрации:

- `signUp` может вернуть `session: null`
- пользователю показывается сообщение проверить почту
- вход возможен только после подтверждения

## Что не входит в текущую реализацию

- таблица `public.profiles` и RLS-политики
- восстановление пароля
- OAuth-провайдеры
- защищённые роуты / redirect после login

## Ручная проверка

1. `npm run dev`
2. **Регистрация:** заполнить форму → аккаунт в Supabase Auth, metadata с `name` и `role`
3. **Вход:** email + password → в хедере имя/email и «Выйти»
4. **Выход:** «Выйти» → снова «Войти» / «Регистрация»
