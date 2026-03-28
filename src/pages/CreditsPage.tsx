import { useEffect, useState } from 'react'
import matchSchedule from '../assets/json/match-schedule.json'
import { api } from '../lib/api'
import {
  TransactionType,
  TransactionStatus,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  type Transaction,
} from '../lib/types'

interface CreditsPageProps {
  userId: string | null
  currentCredits: number
}

type TypeFilter = TransactionType | 'all'

// id → "RCB vs SRH"
const matchLookup = new Map(
  (matchSchedule as Array<{ id: string; firstBattingTeamCode: string; secondBattingTeamCode: string }>).map(
    (m) => [m.id, `${m.firstBattingTeamCode} vs ${m.secondBattingTeamCode}`],
  ),
)

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const TYPE_FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: TransactionType.Deposit, label: 'Deposits' },
  { value: TransactionType.Withdrawal, label: 'Withdrawals' },
  { value: TransactionType.MatchSettlement, label: 'Match Settlement' },
  { value: TransactionType.AdminOverride, label: 'Admin Override' },
]

function typeBadgeClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Deposit:         return 'credits-badge credits-badge--deposit'
    case TransactionType.Withdrawal:      return 'credits-badge credits-badge--withdrawal'
    case TransactionType.MatchSettlement: return 'credits-badge credits-badge--settlement'
    case TransactionType.AdminOverride:   return 'credits-badge credits-badge--override'
    default:                              return 'credits-badge'
  }
}

function statusBadgeClass(status: TransactionStatus): string {
  return status === TransactionStatus.Completed
    ? 'credits-badge credits-badge--completed'
    : 'credits-badge credits-badge--pending'
}

export function CreditsPage({ userId, currentCredits }: CreditsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    api.transactions
      .getByUser(userId)
      .then((data) =>
        setTransactions(
          [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        ),
      )
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load transactions'),
      )
      .finally(() => setLoading(false))
  }, [userId])

  const filtered =
    typeFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.type === typeFilter)

  return (
    <div className="credits-page">
      {/* ── Balance hero ────────────────────────────────────────────── */}
      <div className="credits-hero">
        <p className="credits-hero-label">Current Balance</p>
        <p className="credits-hero-amount">{currentCredits.toFixed(2)}</p>
        <p className="credits-hero-unit">credits</p>
      </div>

      {/* ── Type filter chips ────────────────────────────────────────── */}
      <div className="credits-filters">
        {TYPE_FILTER_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={`credits-chip${typeFilter === opt.value ? ' active' : ''}`}
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Results ─────────────────────────────────────────────────── */}
      <div className="panel credits-table-panel">
        {loading && (
          <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            Loading transactions…
          </p>
        )}

        {error && !loading && (
          <p style={{ color: 'var(--rose)', textAlign: 'center', padding: '1.5rem 0' }}>
            {error}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            {transactions.length === 0 ? 'No transactions found.' : 'No transactions match the selected filter.'}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="subtle" style={{ marginBottom: '0.75rem' }}>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="credits-table-scroll">
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Match</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td className="credits-td-date">{formatDateTime(t.createdAt)}</td>
                      <td>
                        <span className={typeBadgeClass(t.type)}>
                          {TRANSACTION_TYPE_LABELS[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="credits-td-match">
                        {t.matchId ? (matchLookup.get(t.matchId) ?? '—') : '—'}
                      </td>
                      <td
                        className={
                          t.overallCreditChange >= 0
                            ? 'credits-td-amount credits-td-amount--positive'
                            : 'credits-td-amount credits-td-amount--negative'
                        }
                      >
                        {t.overallCreditChange >= 0 ? '+' : ''}
                        {t.overallCreditChange.toFixed(2)}
                      </td>
                      <td>
                        <span className={statusBadgeClass(t.status)}>
                          {TRANSACTION_STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
