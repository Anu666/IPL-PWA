import { useState } from 'react'
import { api, clearApiKey, setApiKey } from '../lib/api'

interface Props {
  onAuthenticated: () => void
}

export function ApiKeyGate({ onAuthenticated }: Props) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setApiKey(trimmed)
    try {
      await api.users.getMe()
      onAuthenticated()
    } catch (err) {
      clearApiKey()
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg.startsWith('[401]') ? 'Invalid API key. Please check and try again.' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gate-shell">
      <div className="gate-card">
        <div className="gate-brand">
          <p className="eyebrow">IPL Questions Game</p>
          <h1 className="gate-title">IPL Gaming Arena</h1>
        </div>

        <p className="gate-subtitle">Enter your API key to access the game</p>

        <form className="gate-form" onSubmit={handleSubmit}>
          <div className="gate-input-wrap">
            <input
              className="gate-input"
              type={showKey ? 'text' : 'password'}
              placeholder="Paste your API key…"
              value={key}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={loading}
              onChange={e => setKey(e.target.value)}
            />
            <button
              type="button"
              className="gate-eye-btn"
              aria-label={showKey ? 'Hide key' : 'Show key'}
              onClick={() => setShowKey(v => !v)}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          {error !== null && <p className="gate-error">{error}</p>}

          <button
            className="gate-btn"
            type="submit"
            disabled={loading || !key.trim()}
          >
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
