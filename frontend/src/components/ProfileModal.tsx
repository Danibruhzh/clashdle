import { useState, useEffect } from 'react'
import { register, login, fetchProfile } from '../api/auth'
import type { UserProfile } from '../api/auth'
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/authSession'
import './ProfileModal.css'

interface ProfileModalProps {
  onClose: () => void
  // Called right after a successful login/register/logout so App.tsx's own
  // "is someone logged in" state (which drives the toolbar badge) stays in
  // sync without this modal needing to own that state itself.
  onAuthChange: (loggedIn: boolean) => void
}

type Mode = 'login' | 'register'

function ProfileModal({ onClose, onAuthChange }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [mode, setMode] = useState<Mode>('login')

  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On open, check whether a token already exists and still works — a
  // token that's since expired or been invalidated just falls back to the
  // logged-out view instead of showing a broken profile.
  useEffect(() => {
    let cancelled = false
    const token = getAuthToken()
    if (!token) {
      setLoadingProfile(false)
      return
    }
    fetchProfile(token)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) clearAuthToken()
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { access_token } = await login(identifier, password)
      setAuthToken(access_token)
      const p = await fetchProfile(access_token)
      setProfile(p)
      onAuthChange(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { access_token } = await register(username, email, password)
      setAuthToken(access_token)
      const p = await fetchProfile(access_token)
      setProfile(p)
      onAuthChange(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Drives the submit buttons' disabled state below — native HTML
  // validation (required/minLength/type="email") is deliberately not used
  // here instead, since that's what pops up the browser's own "Please fill
  // out this field" bubble; disabling the button until these are true
  // blocks submission just as effectively without it.
  const canSubmitLogin = identifier.trim() !== '' && password !== ''
  const canSubmitRegister =
    username.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 8

  const handleLogout = () => {
    clearAuthToken()
    setProfile(null)
    onAuthChange(false)
  }

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>{profile ? 'Your Profile' : mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
          <button className="profile-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loadingProfile ? (
          <p className="profile-modal-loading">Loading…</p>
        ) : profile ? (
          <div className="profile-modal-account">
            <div className="profile-modal-account-row">
              <span className="profile-modal-account-label">Username</span>
              <span className="profile-modal-account-value">{profile.username}</span>
            </div>
            <div className="profile-modal-account-row">
              <span className="profile-modal-account-label">Email</span>
              <span className="profile-modal-account-value">{profile.email}</span>
            </div>
            <button className="profile-modal-logout" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        ) : (
          <>
            <div className="profile-modal-tabs">
              <button
                className={`profile-modal-tab${mode === 'login' ? ' profile-modal-tab--active' : ''}`}
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                type="button"
              >
                Log In
              </button>
              <button
                className={`profile-modal-tab${mode === 'register' ? ' profile-modal-tab--active' : ''}`}
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
                type="button"
              >
                Sign Up
              </button>
            </div>

            {mode === 'login' ? (
              <form className="profile-modal-form" onSubmit={handleLogin}>
                <input
                  className="profile-modal-input"
                  type="text"
                  placeholder="Username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
                <input
                  className="profile-modal-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {error && <p className="profile-modal-error">{error}</p>}
                <button className="profile-modal-submit" type="submit" disabled={submitting || !canSubmitLogin}>
                  {submitting ? 'Logging in…' : 'Log In'}
                </button>
              </form>
            ) : (
              <form className="profile-modal-form" onSubmit={handleRegister}>
                <input
                  className="profile-modal-input"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  maxLength={32}
                />
                <input
                  className="profile-modal-input"
                  type="text"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  className="profile-modal-input"
                  type="password"
                  placeholder="Password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {error && <p className="profile-modal-error">{error}</p>}
                <button className="profile-modal-submit" type="submit" disabled={submitting || !canSubmitRegister}>
                  {submitting ? 'Signing up…' : 'Sign Up'}
                </button>
                <p className="profile-modal-hint">Your current guest stats will carry over to this account.</p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProfileModal
