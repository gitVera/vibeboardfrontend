import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthTab = 'login' | 'register'

type ItTeamRole = (typeof IT_TEAM_ROLES)[number]

const IT_TEAM_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'QA Engineer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
  'Data Analyst',
] as const

const inputClassName =
  'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

type AuthModalProps = {
  open: boolean
  onClose: () => void
  initialTab?: AuthTab
}

const initialLoginForm = {
  email: '',
  password: '',
}

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '' as '' | ItTeamRole,
}

export function AuthModal({ open, onClose, initialTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resetFeedback = () => {
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const resetForms = () => {
    setLoginForm(initialLoginForm)
    setRegisterForm(initialRegisterForm)
  }

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      resetFeedback()
    }
  }, [initialTab, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, open])

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab)
    resetFeedback()
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetFeedback()

    if (!loginForm.email.trim() || !loginForm.password) {
      setErrorMessage('Введите email и пароль.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    resetForms()
    onClose()
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetFeedback()

    const trimmedName = registerForm.name.trim()
    const trimmedEmail = registerForm.email.trim()

    if (!trimmedName || !trimmedEmail || !registerForm.password || !registerForm.confirmPassword) {
      setErrorMessage('Заполните все обязательные поля.')
      return
    }

    if (registerForm.password.length < 8) {
      setErrorMessage('Пароль должен содержать минимум 8 символов.')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMessage('Пароли не совпадают.')
      return
    }

    if (!registerForm.role) {
      setErrorMessage('Выберите роль.')
      return
    }

    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: registerForm.password,
      options: {
        data: {
          name: trimmedName,
          role: registerForm.role,
        },
      },
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data.session) {
      resetForms()
      onClose()
      return
    }

    setSuccessMessage('Аккаунт создан. Проверьте почту для подтверждения регистрации.')
    resetForms()
  }

  if (!open) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Форма входа и регистрации"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {activeTab === 'login' ? 'Вход в Vibeboard' : 'Создание аккаунта'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Закрыть
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
          <button
            type="button"
            onClick={() => switchTab('login')}
            disabled={isSubmitting}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              activeTab === 'login' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            disabled={isSubmitting}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              activeTab === 'register' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </p>
        ) : null}

        {activeTab === 'login' ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                disabled={isSubmitting}
                required
                className={inputClassName}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Пароль
              <input
                type="password"
                placeholder="Введите пароль"
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                disabled={isSubmitting}
                required
                className={inputClassName}
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Входим...' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            <label className="block text-sm text-slate-300">
              Имя
              <input
                type="text"
                placeholder="Ваше имя"
                value={registerForm.name}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={isSubmitting}
                required
                className={inputClassName}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                disabled={isSubmitting}
                required
                className={inputClassName}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Пароль
              <input
                type="password"
                placeholder="Минимум 8 символов"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                disabled={isSubmitting}
                required
                minLength={8}
                className={inputClassName}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Подтверждение пароля
              <input
                type="password"
                placeholder="Повторите пароль"
                value={registerForm.confirmPassword}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                disabled={isSubmitting}
                required
                className={inputClassName}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Роль
              <select
                value={registerForm.role}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    role: event.target.value as '' | ItTeamRole,
                  }))
                }
                disabled={isSubmitting}
                required
                className={inputClassName}
              >
                <option value="" disabled>
                  Выберите роль
                </option>
                {IT_TEAM_ROLES.map((role) => (
                  <option key={role} value={role} className="bg-slate-900 text-white">
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
