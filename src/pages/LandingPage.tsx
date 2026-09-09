type LandingPageProps = {
  onOpenLogin: () => void
  onOpenRegister: () => void
}

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <>
      <section className="flex flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center rounded-full border border-pink-300 bg-pink-100 px-4 py-1 text-sm text-pink-700">
          Task board с AI
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Управляйте задачами и roadmap в одном месте
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Vibeboard помогает разбивать большие цели на подзадачи, отслеживать дедлайны
          и получать уведомления в Telegram — всё с поддержкой AI.
        </p>
        <div id="start" className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onOpenRegister}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-medium text-white shadow-lg shadow-pink-500/25 transition hover:from-fuchsia-400 hover:to-pink-400"
          >
            Создать первую задачу
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            className="rounded-xl border border-rose-200 bg-white/90 px-6 py-3 font-medium text-slate-700 transition hover:bg-rose-100"
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
            className="rounded-2xl border border-rose-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
          </article>
        ))}
      </section>
    </>
  )
}
