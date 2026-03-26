export type PickStatus = 'open' | 'locked_pending' | 'won' | 'lost' | 'penalized'

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

export interface Question {
  id: string
  matchId: string
  questionText: string
  options: Option[]
  credits: number
  sequence: number
  correctOptionId: number | null
  closesAtIst: string
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
