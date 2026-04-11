import { useState } from 'react'
import { api, clearApiKey, setApiKey } from '../lib/api'
import styles from './ApiKeyGate.module.css'

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
    <div className={styles.gateShell}>
      <div className={styles.gateCard}>
        <div className={styles.gateBrand}>
          <p className="eyebrow">IPL Questions Game</p>
          <h1 className={styles.gateTitle}>IPL Gaming Arena</h1>
        </div>

        <p className={styles.gateSubtitle}>Enter your API key to access the game</p>

        <form className={styles.gateForm} onSubmit={handleSubmit}>
          <div className={styles.gateInputWrap}>
            <input
              className={styles.gateInput}
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
              className={styles.gateEyeBtn}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              onClick={() => setShowKey(v => !v)}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          {error !== null && <p className={styles.gateError}>{error}</p>}

          <button
            className={styles.gateBtn}
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
