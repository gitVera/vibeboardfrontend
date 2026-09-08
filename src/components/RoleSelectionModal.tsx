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
  'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-900/30">
        <h2 className="text-xl font-semibold text-white">Выберите вашу роль в команде</h2>
        <p className="mt-2 text-sm text-slate-300">
          Это обязательный шаг после первого входа через Google.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
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
                <option key={teamRole} value={teamRole} className="bg-slate-900 text-white">
                  {teamRole}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!role || isSubmitting}
            className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Сохраняем...' : 'Сохранить роль'}
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Выйти
          </button>
        </form>
      </div>
    </div>
  )
}
