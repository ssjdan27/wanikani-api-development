export interface UserData {
  id: number
  username: string
  level: number
  started_at: string
  subscription?: {
    active: boolean
    type: string
    max_level_granted: number
  }
}

export interface ReviewStatistic {
  id: number
  data: {
    subject_id: number
    subject_type: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
    meaning_correct: number
    meaning_incorrect: number
    meaning_max_streak: number
    meaning_current_streak: number
    reading_correct: number
    reading_incorrect: number
    reading_max_streak: number
    reading_current_streak: number
    percentage_correct: number
    hidden: boolean
    created_at: string
  }
}

export interface Subject {
  id: number
  object: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
  data: {
    level: number
    characters?: string
    meanings: Array<{
      meaning: string
      primary: boolean
    }>
    readings?: Array<{
      reading: string
      primary: boolean
      type?: string
    }>
    hidden_at?: string | null
    created_at: string
  }
}

export interface Assignment {
  id: number
  data: {
    subject_id: number
    subject_type: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
    srs_stage: number
    unlocked_at?: string
    started_at?: string
    passed_at?: string
    burned_at?: string
    available_at?: string
    resurrected_at?: string
    hidden: boolean
  }
}

export interface LevelProgression {
  id: number
  data: {
    level: number
    unlocked_at?: string
    started_at?: string
    passed_at?: string
    completed_at?: string
    abandoned_at?: string
  }
}

export interface ApiResponse<T> {
  object: string
  url: string
  pages?: {
    next_url?: string
    previous_url?: string
    per_page: number
  }
  total_count?: number
  data_updated_at: string
  data: T
}
