type BoardColumn = {
  id: string
  title: string
  cards: BoardCard[]
}

type BoardCard = {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high'
  owner: string
}

const PRIORITY_LABELS: Record<BoardCard['priority'], string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const PRIORITY_STYLES: Record<BoardCard['priority'], string> = {
  low: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  medium: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  high: 'border-red-400/30 bg-red-500/10 text-red-200',
}

const DEMO_BOARD: BoardColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      {
        id: '1',
        title: 'Подготовить roadmap Q1',
        priority: 'high',
        owner: 'PM',
      },
      {
        id: '2',
        title: 'Настроить Telegram webhook',
        priority: 'medium',
        owner: 'Backend',
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [
      {
        id: '3',
        title: 'AI-декомпозиция эпика',
        priority: 'high',
        owner: 'AI',
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [
      {
        id: '4',
        title: 'Supabase Auth + Google OAuth',
        priority: 'medium',
        owner: 'Frontend',
      },
    ],
  },
]

type BoardsPageProps = {
  userName: string
  userRole?: string
}

export function BoardsPage({ userName, userRole }: BoardsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-indigo-300">Мои доски</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Product Board</h1>
          <p className="mt-2 text-sm text-slate-400">
            Добро пожаловать, {userName}
            {userRole ? ` · ${userRole}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          + Новая задача
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {DEMO_BOARD.map((column) => (
          <section
            key={column.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">{column.title}</h2>
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-0.5 text-xs text-slate-400">
                {column.cards.length}
              </span>
            </div>

            <div className="space-y-3">
              {column.cards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-indigo-400/30"
                >
                  <h3 className="text-sm font-medium text-white">{card.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[card.priority]}`}
                    >
                      {PRIORITY_LABELS[card.priority]}
                    </span>
                    <span className="truncate text-xs text-slate-400">{card.owner}</span>
                  </div>
                </article>
              ))}

              {column.cards.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                  Нет задач
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
