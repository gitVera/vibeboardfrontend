import { useEffect, useState } from 'react'
import { parseOAuthCallbackError } from '../lib/auth'
import { supabase } from '../lib/supabase'

type AuthCallbackPageProps = {
  onComplete: () => void
  onReturnHome: () => void
}

export function AuthCallbackPage({ onComplete, onReturnHome }: AuthCallbackPageProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    let isMounted = true

    const completeOAuth = async () => {
      const oauthError = parseOAuthCallbackError()
      if (oauthError) {
        if (isMounted) {
          setErrorMessage(oauthError)
          setIsProcessing(false)
        }
        return
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

        if (error) {
          if (isMounted) {
            setErrorMessage(error.message)
            setIsProcessing(false)
          }
          return
        }

        onComplete()
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Не удалось завершить вход через Google.',
          )
          setIsProcessing(false)
        }
      }
    }

    void completeOAuth()

    return () => {
      isMounted = false
    }
  }, [onComplete])

  if (isProcessing) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-medium text-slate-900">Завершаем вход через Google...</p>
        <p className="mt-2 text-sm text-slate-600">Пожалуйста, подождите несколько секунд.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage ?? 'Не удалось завершить вход через Google.'}
      </p>
      <button
        type="button"
        onClick={onReturnHome}
        className="mt-6 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-100"
      >
        Вернуться на главную
      </button>
    </div>
  )
}
