import { useState, useEffect } from 'react'
import styles from './AwardsPage.module.css'
import { api } from '../../lib/api'
import type { AwardCategory, AwardWinner } from '../../lib/types'

interface AwardsPageProps {
  userId: string | null
}

const POSITION_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function FirstPlaceWinner({ winner, isSelf }: { winner: AwardWinner; isSelf: boolean }) {
  return (
    <div className={`${styles.firstPlace} ${isSelf ? styles.firstPlaceSelf : ''}`}>
      <div className={styles.firstPlaceCrown}>👑</div>
      <div className={styles.firstPlaceName}>{winner.userName}{isSelf ? ' (You)' : ''}</div>
      <div className={styles.firstPlaceValue}>{winner.formattedValue}</div>
    </div>
  )
}

function WinnerRow({ winner, isSelf }: { winner: AwardWinner; isSelf: boolean }) {
  return (
    <div className={`${styles.winnerRow} ${isSelf ? styles.self : ''}`}>
      <span className={styles.medal}>{POSITION_MEDAL[winner.position] ?? `#${winner.position}`}</span>
      <span className={styles.winnerName}>{winner.userName}{isSelf ? ' (You)' : ''}</span>
      <span className={styles.winnerValue}>{winner.formattedValue}</span>
    </div>
  )
}

function AwardCard({
  category,
  userId,
  onViewAll,
}: {
  category: AwardCategory
  userId: string | null
  onViewAll: () => void
}) {
  const podium = category.winners.filter((w) => w.position <= 3)
  const hasMore = category.winners.some((w) => w.position > 3)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.emoji}>{category.emoji}</span>
        <div>
          <h3 className={styles.title}>{category.label}</h3>
          <p className={styles.description}>{category.description}</p>
        </div>
      </div>
      <div className={styles.winners}>
        {podium.length === 0 ? (
          <p className={styles.noWinners}>No data yet</p>
        ) : (
          <>
            {podium.filter((w) => w.position === 1).map((w) => (
              <FirstPlaceWinner
                key={`${w.userId}-${w.position}`}
                winner={w}
                isSelf={w.userId === userId}
              />
            ))}
            {podium.filter((w) => w.position > 1).map((w) => (
              <WinnerRow
                key={`${w.userId}-${w.position}`}
                winner={w}
                isSelf={w.userId === userId}
              />
            ))}
          </>
        )}
      </div>
      {hasMore && (
        <button type="button" className={styles.viewAll} onClick={onViewAll}>
          View all rankings →
        </button>
      )}
    </div>
  )
}

function AwardDetailView({
  category,
  userId,
  onBack,
}: {
  category: AwardCategory
  userId: string | null
  onBack: () => void
}) {
  return (
    <section className="panel">
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back to Awards
      </button>
      <div className={styles.detailHeader}>
        <span className={styles.detailEmoji}>{category.emoji}</span>
        <div>
          <h2 className={styles.detailTitle}>{category.label}</h2>
          <p className={styles.description}>{category.description}</p>
        </div>
      </div>
      <div className={styles.detailList}>
        {category.winners.map((w) => (
          <div
            key={w.userId}
            className={`${styles.detailRow} ${w.position <= 3 ? styles.podium : ''} ${w.userId === userId ? styles.self : ''}`}
          >
            <span className={styles.medal}>{POSITION_MEDAL[w.position] ?? `#${w.position}`}</span>
            <span className={styles.winnerName}>{w.userName}{w.userId === userId ? ' (You)' : ''}</span>
            <span className={styles.winnerValue}>{w.formattedValue}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AwardsPage({ userId }: AwardsPageProps) {
  const [categories, setCategories] = useState<AwardCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AwardCategory | null>(null)

  useEffect(() => {
    api.awards
      .get()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="panel">
        <h2>Awards</h2>
        <p className="subtle">Loading…</p>
      </section>
    )
  }

  if (selected) {
    return <AwardDetailView category={selected} userId={userId} onBack={() => setSelected(null)} />
  }

  if (categories.length === 0) {
    return (
      <section className="panel">
        <h2>Awards</h2>
        <p className="subtle">Awards appear after the first match is marked Done.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Awards</h2>
      <div className={styles.grid}>
        {categories.map((cat) => (
          <AwardCard key={cat.key} category={cat} userId={userId} onViewAll={() => setSelected(cat)} />
        ))}
      </div>
    </section>
  )
}
