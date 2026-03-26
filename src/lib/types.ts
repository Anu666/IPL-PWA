export type MatchStatus = 'upcoming' | 'ongoing' | 'completed'

export type QuestionType =
  | 'match_winner'
  | 'toss_winner'
  | 'top_batter_team'
  | 'top_bowler_team'
  | 'most_sixes_team'

export type PickStatus =
  | 'open'
  | 'locked_pending'
  | 'won'
  | 'lost'
  | 'penalized'

export interface Match {
  id: number
  name: string
  status: MatchStatus
  startsAtIst: string
  groundName: string
  city: string
  homeTeamId: number
  homeTeamCode: string
  homeTeamName: string
  homeTeamLogo: string
  awayTeamId: number
  awayTeamCode: string
  awayTeamName: string
  awayTeamLogo: string
}

export interface QuestionOption {
  id: string
  label: string
}

export interface Question {
  id: string
  matchId: number
  order: number
  type: QuestionType
  text: string
  options: QuestionOption[]
  creditValue: number
  closesAtIst: string
}

export interface UserProfile {
  id: string
  name: string
  startingCredits: number
  createdAt: string
}

export interface Prediction {
  id: string
  userId: string
  matchId: number
  questionId: string
  selectedOptionId: string
  submittedAt: string
}

export interface QuestionResult {
  id: string
  matchId: number
  questionId: string
  correctOptionId: string
  resolvedAt: string
}

export interface PickEvaluation {
  questionId: string
  status: PickStatus
  deltaCredits: number
  note: string
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
  matchId: number
  matchName: string
  questionText: string
  selectedOptionLabel: string
  status: PickStatus
  deltaCredits: number
  note: string
  closesAtIst: string
}

export interface MatchScheduleRoot {
  Matchsummary: RawScheduleMatch[]
}

export interface RawScheduleMatch {
  MatchID: number
  MatchStatus: string
  MatchName: string
  MatchDate: string
  MatchTime: string
  MATCH_COMMENCE_START_DATE: string
  GroundName: string
  city: string
  FirstBattingTeamID: number
  FirstBattingTeamCode: string
  FirstBattingTeamName: string
  MatchHomeTeamLogo: string
  SecondBattingTeamID: number
  SecondBattingTeamCode: string
  SecondBattingTeamName: string
  MatchAwayTeamLogo: string
}

export interface QuestionTemplate {
  templateId: string
  type: QuestionType
  text: string
  creditValue: number
}

export interface QuestionTemplateRoot {
  defaultQuestionSet: QuestionTemplate[]
  matchCreditCap: number
  closeOffsetMinutes: number
}
