import { FormEvent, useEffect, useState } from 'react'
import { IT_TEAM_ROLES, type ItTeamRole } from '../constants/roles'

type RoleSelectionModalProps = {
  open: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onSubmit: (role: ItTeamRole) => Promise<void>
  onSignOut: () => Promise<void>
}

const inputClassName =
  'mt-1 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export function RoleSelectionModal({
  open,
  isSubmitting,
  errorMessage,
  onSubmit,
  onSignOut,
}: RoleSelectionModalProps) {
  const [role, setRole] = useState<'' | ItTeamRole>('')

  useEffect(() => {
    if (open) {
      setRole('')
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!role) {
      return
    }

    await onSubmit(role)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Выбор роли после входа через Google"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-2xl shadow-pink-200/50">
        <h2 className="text-xl font-semibold text-slate-900">Выберите вашу роль в команде</h2>
        <p className="mt-2 text-sm text-slate-600">
          Это обязательный шаг после первого входа через Google.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-700">
            Роль
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as '' | ItTeamRole)}
              disabled={isSubmitting}
              required
              className={inputClassName}
            >
              <option value="" disabled>
                Выберите роль
              </option>
              {IT_TEAM_ROLES.map((teamRole) => (
                <option key={teamRole} value={teamRole} className="bg-white text-slate-800">
                  {teamRole}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!role || isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Сохраняем...' : 'Сохранить роль'}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Выйти
          </button>
        </form>
      </div>
    </div>
  )
}
