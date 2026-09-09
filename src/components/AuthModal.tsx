import { FormEvent, useEffect, useState } from 'react'
import { IT_TEAM_ROLES, type ItTeamRole } from '../constants/roles'
import { getAuthCallbackUrl } from '../lib/auth'
import { supabase } from '../lib/supabase'

type AuthTab = 'login' | 'register'

const inputClassName =
  'mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

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

  const handleGoogleSignIn = async () => {
    resetFeedback()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      })

      if (error) {
        setErrorMessage(`Не удалось начать вход через Google: ${error.message}`)
        setIsSubmitting(false)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Не удалось начать вход через Google: ${error.message}`
          : 'Не удалось начать вход через Google.',
      )
      setIsSubmitting(false)
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {activeTab === 'login' ? 'Вход в Vibeboard' : 'Создание аккаунта'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-rose-100 hover:text-slate-800"
          >
            Закрыть
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-rose-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => switchTab('login')}
            disabled={isSubmitting}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              activeTab === 'login' ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white' : 'text-slate-600 hover:text-pink-700'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            disabled={isSubmitting}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              activeTab === 'register' ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white' : 'text-slate-600 hover:text-pink-700'
            }`}
          >
            Регистрация
          </button>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isSubmitting}
          className="mb-4 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Переходим в Google...' : 'Продолжить через Google'}
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-rose-200" />
          <span>или</span>
          <span className="h-px flex-1 bg-rose-200" />
        </div>

        {activeTab === 'login' ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <label className="block text-sm text-slate-700">
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
            <label className="block text-sm text-slate-700">
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
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Входим...' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            <label className="block text-sm text-slate-700">
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
            <label className="block text-sm text-slate-700">
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
            <label className="block text-sm text-slate-700">
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
            <label className="block text-sm text-slate-700">
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
            <label className="block text-sm text-slate-700">
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
                  <option key={role} value={role} className="bg-white text-slate-800">
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
