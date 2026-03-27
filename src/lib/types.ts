export type PickStatus = 'open' | 'locked_pending' | 'won' | 'lost' | 'penalized'

export const MatchStatusValue = {
  NotStarted: 0,
  ReadyForPicks: 1,
  PicksClosed: 2,
  BetsUpdated: 3,
  MatchCompleted: 4,
  BetsSettled: 5,
} as const
export type MatchStatusValue = (typeof MatchStatusValue)[keyof typeof MatchStatusValue]

export const MATCH_STATUS_LABELS: Record<number, string> = {
  0: 'Not Started',
  1: 'Ready for Picks',
  2: 'Picks Closed',
  3: 'Bets Updated',
  4: 'Match Completed',
  5: 'Bets Settled',
}

export interface MatchStatusRecord {
  id: string
  matchId: string
  status: number
}

export interface Match {
  id: string
  matchDate: string
  matchName: string
  matchTime: string
  gmtMatchTime: string
  gmtMatchDate: string
  gmtMatchEndTime: string
  gmtMatchEndDate: string
  firstBattingTeamID: number
  firstBattingTeamName: string
  firstBattingTeamCode: string
  secondBattingTeamID: number
  secondBattingTeamName: string
  secondBattingTeamCode: string
  groundID: number
  groundName: string
  matchCommenceStartDate: string
  city: string
  homeTeamID: number
  homeTeamName: string
  awayTeamID: number
  awayTeamName: string
}

export interface Option {
  id: number
  optionText: string
}

export interface VoterInfo {
  userId: string
  userName: string
}

export interface OptionBettingStats {
  optionId: number
  voteCount: number
  voters: VoterInfo[]
  potentialWinCredits: number
}

export interface QuestionBettingStats {
  totalEligible: number
  totalVotes: number
  unansweredCount: number
  optionStats: OptionBettingStats[]
}

export interface Question {
  id: string
  matchId: string
  questionText: string
  options: Option[]
  credits: number
  sequence: number
  correctOptionId: number | null
  closesAtIst: string
  bettingStats?: QuestionBettingStats | null
}

export interface Answer {
  questionId: string
  selectedOption: number
}

export interface UserAnswer {
  id: string
  matchId: string
  userId: string
  answers: Answer[]
}

export interface LeaderboardRow {
  userId: string
  userName: string
  currentCredits: number
  wins: number
  losses: number
  penalized: number
  rank: number
}

export interface UserHistoryEntry {
  matchId: string
  matchName: string
  questionText: string
  selectedOptionLabel: string
  status: PickStatus
  deltaCredits: number
  note: string
  closesAtIst: string
}
