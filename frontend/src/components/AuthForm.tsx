import { useState } from 'react'
import { register, login } from '../api/auth'
import { setAuthToken } from '../utils/authSession'
// Imported here (not just by ProfileModal) since this component also
// renders standalone on UnlimitedPage, which never mounts ProfileModal —
// without this import there, the profile-modal-tabs/-form/-input classnames
// below would be unstyled on that route. Vite dedupes a CSS file imported
// from multiple modules, so ProfileModal.tsx keeping its own import too is
// harmless.
import './ProfileModal.css'

// The tabbed login/signup form itself, factored out of ProfileModal so it
// can also render standalone — full-page, no backdrop/close button — as
// UnlimitedPage's not-logged-in gate. Shares ProfileModal.css's classnames
// (profile-modal-tabs/-form/-input/etc.) rather than a separate stylesheet,
// since both call sites want the exact same look.

interface AuthFormProps {
  // Called right after a successful login/register so the caller's own
  // "is someone logged in" state stays in sync without this component
  // needing to own that state itself — same contract as ProfileModal's
  // own onAuthChange prop, since that's just passed straight through.
  onAuthChange: (loggedIn: boolean) => void
}

type Mode = 'login' | 'register'

function AuthForm({ onAuthChange }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>('login')

  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // sign-up only
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { access_token } = await login(identifier, password)
      setAuthToken(access_token)
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
  const canSubmitLogin = identifier.trim() !== '' && password.length >= 8
  const canSubmitRegister =
    username.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 8 &&
    confirmPassword === password

  return (
    <>
      <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
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
          <input
            className="profile-modal-input"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
  )
}

export default AuthForm
