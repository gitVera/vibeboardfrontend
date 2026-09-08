export const AUTH_CALLBACK_PATH = '/auth/callback'

export function getAuthCallbackUrl(): string {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`
}

export function isAuthCallbackPath(pathname: string = window.location.pathname): boolean {
  return pathname === AUTH_CALLBACK_PATH
}

export function parseOAuthCallbackError(search: string = window.location.search): string | null {
  const params = new URLSearchParams(search)
  const errorDescription = params.get('error_description')
  const error = params.get('error')

  if (errorDescription) {
    return errorDescription
  }

  if (error) {
    return error
  }

  return null
}
