export interface UserData {
  id: number
  username: string
  level: number
  started_at: string
  current_vacation_started_at?: string | null
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
    slug?: string
    document_url?: string
    spaced_repetition_system_id?: number
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
    // Dependency tree fields
    component_subject_ids?: number[]      // Radicals/kanji that make up this subject
    amalgamation_subject_ids?: number[]   // Kanji/vocab that use this subject as a component
    // Similar kanji fields
    visually_similar_subject_ids?: number[] // IDs of visually similar kanji
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

export interface SpacedRepetitionSystem {
  id: number
  object: 'spaced_repetition_system'
  data: {
    name: string
    description?: string
    unlocking_stage_position: number
    starting_stage_position: number
    passing_stage_position: number
    burning_stage_position: number
    stages: Array<{
      interval: number | null
      position: number
      interval_unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | null
    }>
  }
}

export interface Summary {
  object: 'report'
  url: string
  data_updated_at: string
  data: {
    lessons: Array<{
      available_at: string
      subject_ids: number[]
    }>
    next_reviews_at: string | null
    reviews: Array<{
      available_at: string
      subject_ids: number[]
    }>
  }
}

export interface Review {
  id: number
  data_updated_at?: string
  data: {
    assignment_id: number
    subject_id: number
    subject_type: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
    created_at: string
    meaning_correct: number
    meaning_incorrect: number
    reading_correct: number
    reading_incorrect: number
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
  lastAccessed?: number  // For LRU eviction
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
  spacedRepetitionSystems: number // SRS definitions (12 hours)
}
