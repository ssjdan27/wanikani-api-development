export interface UserData {
  id: number
  username: string
  level: number
  started_at: string
  subscription?: {
    active: boolean
    type: "lifetime" | "recurring" | "free" | "unknown"
    max_level_granted: number
    period_ends_at?: string | null
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

export interface CacheEntry<T> {
  data: T
  etag?: string
  lastModified?: string
  timestamp: number
  expiresAt?: number
}

export interface CacheConfig {
  // Cache durations in milliseconds
  subjects: number      // Cache subjects aggressively (24 hours)
  user: number         // User data (1 hour)
  assignments: number  // Assignments (30 minutes)
  reviewStats: number  // Review statistics (30 minutes)
  reviews: number      // Reviews (permanent - never change once recorded)
  summary: number      // Summary (1 hour - changes every hour)
  levelProgressions: number // Level progressions (1 hour)
}
