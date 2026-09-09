import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthModal } from './components/AuthModal'
import { RoleSelectionModal } from './components/RoleSelectionModal'
import type { ItTeamRole } from './constants/roles'
import { AUTH_CALLBACK_PATH } from './lib/auth'
import { supabase } from './lib/supabase'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { BoardsPage } from './pages/BoardsPage'
import { LandingPage } from './pages/LandingPage'

type AuthTab = 'login' | 'register'

function getUserDisplayName(session: Session): string {
  const metadataName = session.user.user_metadata?.name
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim()
  }

  return session.user.email ?? 'Пользователь'
}

function getUserInitial(displayName: string): string {
  return displayName.charAt(0).toUpperCase()
}

function hasUserRole(session: Session): boolean {
  const role = session.user.user_metadata?.role
  return typeof role === 'string' && role.trim().length > 0
}

function isBoardsPath(pathname: string): boolean {
  return pathname === '/boards' || pathname.startsWith('/boards/')
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)
  const [authInitialTab, setAuthInitialTab] = useState<AuthTab>('login')
  const [session, setSession] = useState<Session | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [isRoleModalOpen, setRoleModalOpen] = useState(false)
  const [isRoleSaving, setRoleSaving] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession)
        setRoleModalOpen(Boolean(currentSession && !hasUserRole(currentSession)))
        if (currentSession && !isBoardsPath(location.pathname) && location.pathname !== AUTH_CALLBACK_PATH) {
          navigate('/boards', { replace: true })
        }
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (nextSession) {
        setAuthModalOpen(false)
        if (!isBoardsPath(location.pathname) && location.pathname !== AUTH_CALLBACK_PATH) {
          navigate('/boards')
        }
      }

      if (nextSession && !hasUserRole(nextSession)) {
        setRoleModalOpen(true)
        return
      }

      setRoleModalOpen(false)
      setRoleError(null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [location.pathname, navigate])

  const openAuthModal = (tab: AuthTab) => {
    setAuthInitialTab(tab)
    setAuthModalOpen(true)
  }

  const handleAuthCallbackComplete = useCallback(() => {
    navigate('/boards', { replace: true })
  }, [navigate])

  const handleAuthCallbackReturnHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  const handleRoleSubmit = async (role: ItTeamRole) => {
    if (!session) {
      return
    }

    setRoleSaving(true)
    setRoleError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...session.user.user_metadata,
          role,
        },
      })

      if (error) {
        setRoleError(error.message)
        return
      }

      setRoleModalOpen(false)
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : 'Не удалось сохранить роль.')
    } finally {
      setRoleSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSignOutError(null)
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()

    setIsSigningOut(false)

    if (error) {
      setSignOutError(error.message)
      return
    }

    navigate('/', { replace: true })
  }

  const isAuthenticated = session !== null
  const displayName = session ? getUserDisplayName(session) : ''
  const userInitial = displayName ? getUserInitial(displayName) : ''
  const userRole =
    session && typeof session.user.user_metadata?.role === 'string'
      ? session.user.user_metadata.role
      : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-violet-100 text-slate-800">
      <header className="border-b border-rose-200/70 bg-white/75 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 font-bold text-white shadow-sm">
              V
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Vibeboard</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            {isAuthenticated ? (
              <span className="font-medium text-slate-900">Boards</span>
            ) : (
              <>
                <a href="#features" className="transition hover:text-pink-600">
                  Возможности
                </a>
                <a href="#start" className="transition hover:text-pink-600">
                  Начать
                </a>
              </>
            )}
          </nav>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <div className="flex min-w-0 items-center gap-2 rounded-lg border border-rose-200 bg-white/90 px-3 py-2">
                    <div
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-sm font-semibold text-white"
                    >
                      {userInitial}
                    </div>
                    <span className="max-w-[10rem] truncate text-sm text-slate-800 sm:max-w-[14rem]">
                      {displayName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="rounded-lg border border-rose-200 bg-white/90 px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningOut ? 'Выходим...' : 'Выйти'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="rounded-lg border border-rose-200 bg-white/90 px-4 py-2 text-sm text-slate-700 transition hover:bg-rose-100"
                  >
                    Войти
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:from-fuchsia-400 hover:to-pink-400"
                  >
                    Регистрация
                  </button>
                </>
              )}
            </div>
            {signOutError ? <p className="max-w-xs text-right text-xs text-red-500">{signOutError}</p> : null}
          </div>
        </div>
      </header>

      <main className={isAuthenticated ? '' : 'mx-auto max-w-6xl px-6 py-16'}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onOpenLogin={() => openAuthModal('login')}
                onOpenRegister={() => openAuthModal('register')}
              />
            }
          />
          <Route
            path="/boards/*"
            element={
              <BoardsPage
                userName={isAuthenticated ? displayName : 'Гость'}
                userRole={isAuthenticated ? userRole : undefined}
              />
            }
          />
          <Route
            path={AUTH_CALLBACK_PATH}
            element={
              <AuthCallbackPage
                onComplete={handleAuthCallbackComplete}
                onReturnHome={handleAuthCallbackReturnHome}
              />
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/boards' : '/'} replace />} />
        </Routes>
      </main>

      <footer className="border-t border-rose-200/70 py-8 text-center text-sm text-slate-500">
        Vibeboard — стартовый скелет приложения
      </footer>

      <AuthModal open={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authInitialTab} />
      <RoleSelectionModal
        open={isRoleModalOpen}
        isSubmitting={isRoleSaving || isSigningOut}
        errorMessage={roleError}
        onSubmit={handleRoleSubmit}
        onSignOut={handleSignOut}
      />
    </div>
  )
}

export default App
