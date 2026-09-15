import { useCallback, useEffect, useState } from 'react'
import { fetchProfile } from '../api/auth'
import { AUTH_SESSION_EVENT, clearAuthToken, getAuthToken } from './authSession'

function hasStoredToken(): boolean {
  return getAuthToken() !== null
}

export function useAuthStatus(): [boolean, (loggedIn: boolean) => void, boolean] {
  const [loggedIn, setLoggedIn] = useState(() => hasStoredToken())
  const [authVerified, setAuthVerified] = useState(() => !hasStoredToken())

  const syncAuthStatus = useCallback(() => {
    const token = getAuthToken()
    if (!token) {
      setLoggedIn(false)
      setAuthVerified(true)
      return
    }

    setLoggedIn(true)
    setAuthVerified(false)
    fetchProfile(token)
      .then(() => {
        if (getAuthToken() !== token) return
        setLoggedIn(true)
        setAuthVerified(true)
      })
      .catch(() => {
        if (getAuthToken() !== token) return
        clearAuthToken()
        setLoggedIn(false)
        setAuthVerified(true)
      })
  }, [])

  useEffect(() => {
    syncAuthStatus()

    const handleAuthSessionChange = () => {
      syncAuthStatus()
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'clashdle-auth-token') {
        syncAuthStatus()
      }
    }

    window.addEventListener(AUTH_SESSION_EVENT, handleAuthSessionChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, handleAuthSessionChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [syncAuthStatus])

  const setAuthStatus = useCallback((nextLoggedIn: boolean) => {
    setLoggedIn(nextLoggedIn && hasStoredToken())
    setAuthVerified(true)
  }, [])

  return [loggedIn, setAuthStatus, authVerified]
}
