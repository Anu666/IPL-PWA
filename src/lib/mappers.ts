import matchScheduleRaw from '../assets/json/match-schedule.json'
import type { Match } from './types'

export const getMappedMatches = (): Match[] => {
  const matches = matchScheduleRaw as Match[]
  return [...matches].sort(
    (a, b) =>
      new Date(a.matchCommenceStartDate).getTime() -
      new Date(b.matchCommenceStartDate).getTime(),
  )
}
