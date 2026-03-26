import matchScheduleRaw from '../assets/json/match-schedule.json'
import type { Match, MatchScheduleRoot, MatchStatus, RawScheduleMatch } from './types'
import { parseStartDate } from './time'

const mapStatus = (rawStatus: string): MatchStatus => {
  const normalized = rawStatus.toLowerCase()

  if (normalized.includes('complete')) {
    return 'completed'
  }

  if (normalized.includes('live') || normalized.includes('progress')) {
    return 'ongoing'
  }

  return 'upcoming'
}

const mapMatch = (raw: RawScheduleMatch): Match => {
  const startsAtIst = parseStartDate(
    raw.MATCH_COMMENCE_START_DATE,
    raw.MatchDate,
    raw.MatchTime,
  )

  return {
    id: raw.MatchID,
    name: raw.MatchName,
    status: mapStatus(raw.MatchStatus),
    startsAtIst,
    groundName: raw.GroundName,
    city: raw.city,
    homeTeamId: raw.FirstBattingTeamID,
    homeTeamCode: raw.FirstBattingTeamCode,
    homeTeamName: raw.FirstBattingTeamName,
    homeTeamLogo: raw.MatchHomeTeamLogo,
    awayTeamId: raw.SecondBattingTeamID,
    awayTeamCode: raw.SecondBattingTeamCode,
    awayTeamName: raw.SecondBattingTeamName,
    awayTeamLogo: raw.MatchAwayTeamLogo,
  }
}

export const getMappedMatches = () => {
  const typed = matchScheduleRaw as MatchScheduleRoot
  return typed.Matchsummary.map(mapMatch).sort((a, b) => {
    return new Date(a.startsAtIst).getTime() - new Date(b.startsAtIst).getTime()
  })
}
