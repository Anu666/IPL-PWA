export type PickStatus = 'open' | 'locked_pending' | 'won' | 'lost' | 'penalized'

export const MatchStatusValue = {
  NotStarted:           0,
  ReadyForPicks:        1,
  PicksClosed:          2,
  BetsUpdated:          3,
  MatchCompleted:       4,
  BetsSettled:          5,
  TransactionsSettled:  6,
  Done:                 7,
} as const
export type MatchStatusValue = (typeof MatchStatusValue)[keyof typeof MatchStatusValue]

export const MATCH_STATUS_LABELS: Record<number, string> = {
  0: 'Not Started',
  1: 'Ready for Picks',
  2: 'Picks Closed',
  3: 'Bets Updated',
  4: 'Match Completed',
  5: 'Bets Settled',
  6: 'Transactions Settled',
  7: 'Done',
}

export const OutcomeType = {
  Won: 0,
  Lost: 1,
  AutoLost: 2,
  Voided: 3,
} as const
export type OutcomeType = (typeof OutcomeType)[keyof typeof OutcomeType]

export const OUTCOME_LABELS: Record<number, string> = {
  0: 'Won',
  1: 'Lost',
  2: 'Auto-Lost',
  3: 'Voided',
}

export interface QuestionFinalStats {
  correctOptionId: number | null
  winners: VoterInfo[]
  losers: VoterInfo[]
  autoLost: VoterInfo[]
  isVoided: boolean
  creditChangePerWinner: number
  settledAt: string
}

export interface Change {
  questionId: string
  creditChange: number
  outcome: OutcomeType
}

export interface MatchSummaryEntry {
  userId: string
  userName: string
  overallCreditChange: number
  changes: Change[]
}

export interface MatchStatusRecord {
  id: string
  matchId: string
  status: number
  matchSummary?: MatchSummaryEntry[] | null
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
  finalStats?: QuestionFinalStats | null
}

export interface Answer {
  questionId: string
  selectedOption: number
  isCorrect?: boolean | null
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
