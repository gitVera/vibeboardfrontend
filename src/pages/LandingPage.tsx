type LandingPageProps = {
  onOpenLogin: () => void
  onOpenRegister: () => void
}

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <>
      <section className="flex flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1 text-sm text-indigo-300">
          Task board с AI
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Управляйте задачами и roadmap в одном месте
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Vibeboard помогает разбивать большие цели на подзадачи, отслеживать дедлайны
          и получать уведомления в Telegram — всё с поддержкой AI.
        </p>
        <div id="start" className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onOpenRegister}
            className="rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            Создать первую задачу
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
          >
            Посмотреть roadmap
          </button>
        </div>
      </section>

      <section id="features" className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'AI-декомпозиция',
            description: 'Разбивайте эпики на задачи и подзадачи с владельцами, приоритетами и оценками.',
          },
          {
            title: 'Roadmap из данных',
            description: 'Таймлайн строится из графа задач и дедлайнов, а не из статичных заглушек.',
          },
          {
            title: 'Telegram-интеграция',
            description: 'Создавайте задачи из чата и получайте уведомления о просрочках.',
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
          </article>
        ))}
      </section>
    </>
  )
}
