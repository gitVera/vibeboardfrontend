# Vibeboard Frontend

Task board с AI: React + TypeScript + Tailwind CSS + Supabase Auth.

## Быстрый старт

Для локального запуска у нового разработчика: скопируйте `.env.example` в `.env.local` и подставьте ключи из Supabase Dashboard.

```bash
npm install
cp .env.example .env.local
# Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Локальный dev-сервер (Vite) |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр production-сборки |

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |

Ключи берутся из [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

## Аутентификация

Реализованы модальные формы входа и регистрации с интеграцией Supabase Auth.

Подробнее: [docs/auth.md](./docs/auth.md)

## Структура

```
src/
├── App.tsx                 # Лендинг, хедер, сессия, профиль
├── components/
│   ├── AuthModal.tsx       # Попап входа/регистрации
│   └── FloatingSymbols.tsx # Декоративные символы
└── lib/
    └── supabase.ts         # Supabase client
```
