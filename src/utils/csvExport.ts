import type { Assignment, ReviewStatistic, LevelProgression, Subject, SpacedRepetitionSystem } from '@/types/wanikani'

/**
 * Escapes a CSV field value by wrapping in quotes if necessary
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const stringValue = String(value)
  
  // If the value contains a comma, newline, or double quote, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    // Escape double quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Converts an array of objects to a CSV string
 */
export function arrayToCSV<T extends object>(data: T[], columns?: { key: string; header: string }[]): string {
  if (data.length === 0) {
    return ''
  }

  // If columns are specified, use them; otherwise derive from first object
  const headers = columns 
    ? columns.map(c => c.header)
    : Object.keys(data[0])
  
  const keys = columns 
    ? columns.map(c => c.key)
    : Object.keys(data[0])

  const headerRow = headers.map(escapeCSVField).join(',')
  
  const dataRows = data.map(row => {
    return keys.map(key => {
      // Support nested keys like 'data.subject_id'
      const value = key.split('.').reduce((obj: unknown, k) => {
        if (obj && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[k]
        }
        return undefined
      }, row)
      return escapeCSVField(value)
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Triggers a browser download of a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Helper to get SRS stage name from stage number
 */
function getSRSStageName(srsStage: number): string {
  const stageNames: Record<number, string> = {
    0: 'Lesson',
    1: 'Apprentice 1',
    2: 'Apprentice 2',
    3: 'Apprentice 3',
    4: 'Apprentice 4',
    5: 'Guru 1',
    6: 'Guru 2',
    7: 'Master',
    8: 'Enlightened',
    9: 'Burned'
  }
  return stageNames[srsStage] || `Stage ${srsStage}`
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string | undefined, date2: string | Date): number | null {
  if (!date1) return null
  const d1 = new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Transform assignments data with computed fields
 */
export interface AssignmentExport {
  id: number
  subject_id: number
  subject_type: string
  srs_stage: number
  srs_stage_name: string
  unlocked_at: string
  started_at: string
  passed_at: string
  burned_at: string
  available_at: string
  resurrected_at: string
  is_burned: boolean
  days_since_unlock: number | null
  days_since_started: number | null
}

export function transformAssignments(assignments: Assignment[]): AssignmentExport[] {
  const now = new Date()
  
  return assignments.map(a => ({
    id: a.id,
    subject_id: a.data.subject_id,
    subject_type: a.data.subject_type,
    srs_stage: a.data.srs_stage,
    srs_stage_name: getSRSStageName(a.data.srs_stage),
    unlocked_at: a.data.unlocked_at || '',
    started_at: a.data.started_at || '',
    passed_at: a.data.passed_at || '',
    burned_at: a.data.burned_at || '',
    available_at: a.data.available_at || '',
    resurrected_at: a.data.resurrected_at || '',
    is_burned: a.data.srs_stage === 9,
    days_since_unlock: daysBetween(a.data.unlocked_at, now),
    days_since_started: daysBetween(a.data.started_at, now)
  }))
}

export const assignmentColumns = [
  { key: 'id', header: 'ID' },
  { key: 'subject_id', header: 'Subject ID' },
  { key: 'subject_type', header: 'Subject Type' },
  { key: 'srs_stage', header: 'SRS Stage' },
  { key: 'srs_stage_name', header: 'SRS Stage Name' },
  { key: 'unlocked_at', header: 'Unlocked At' },
  { key: 'started_at', header: 'Started At' },
  { key: 'passed_at', header: 'Passed At' },
  { key: 'burned_at', header: 'Burned At' },
  { key: 'available_at', header: 'Available At' },
  { key: 'resurrected_at', header: 'Resurrected At' },
  { key: 'is_burned', header: 'Is Burned' },
  { key: 'days_since_unlock', header: 'Days Since Unlock' },
  { key: 'days_since_started', header: 'Days Since Started' }
]

/**
 * Transform review statistics with computed fields
 */
export interface ReviewStatExport {
  id: number
  subject_id: number
  subject_type: string
  meaning_correct: number
  meaning_incorrect: number
  meaning_total: number
  meaning_accuracy_percent: number | null
  meaning_max_streak: number
  meaning_current_streak: number
  reading_correct: number
  reading_incorrect: number
  reading_total: number
  reading_accuracy_percent: number | null
  reading_max_streak: number
  reading_current_streak: number
  total_correct: number
  total_incorrect: number
  total_accuracy_percent: number | null
  leech_score: number
  created_at: string
}

export function transformReviewStats(stats: ReviewStatistic[]): ReviewStatExport[] {
  return stats.map(s => {
    const meaningTotal = s.data.meaning_correct + s.data.meaning_incorrect
    const readingTotal = s.data.reading_correct + s.data.reading_incorrect
    const totalCorrect = s.data.meaning_correct + s.data.reading_correct
    const totalIncorrect = s.data.meaning_incorrect + s.data.reading_incorrect
    const total = totalCorrect + totalIncorrect
    
    // Leech score calculation (higher = worse)
    // Based on WaniKani's formula: incorrect / (correct^1.5) 
    const leechScore = totalCorrect > 0 
      ? totalIncorrect / Math.pow(totalCorrect, 1.5)
      : totalIncorrect > 0 ? 999 : 0
    
    return {
      id: s.id,
      subject_id: s.data.subject_id,
      subject_type: s.data.subject_type,
      meaning_correct: s.data.meaning_correct,
      meaning_incorrect: s.data.meaning_incorrect,
      meaning_total: meaningTotal,
      meaning_accuracy_percent: meaningTotal > 0 ? Math.round((s.data.meaning_correct / meaningTotal) * 100) : null,
      meaning_max_streak: s.data.meaning_max_streak,
      meaning_current_streak: s.data.meaning_current_streak,
      reading_correct: s.data.reading_correct,
      reading_incorrect: s.data.reading_incorrect,
      reading_total: readingTotal,
      reading_accuracy_percent: readingTotal > 0 ? Math.round((s.data.reading_correct / readingTotal) * 100) : null,
      reading_max_streak: s.data.reading_max_streak,
      reading_current_streak: s.data.reading_current_streak,
      total_correct: totalCorrect,
      total_incorrect: totalIncorrect,
      total_accuracy_percent: total > 0 ? Math.round((totalCorrect / total) * 100) : null,
      leech_score: Math.round(leechScore * 100) / 100,
      created_at: s.data.created_at
    }
  })
}

export const reviewStatColumns = [
  { key: 'id', header: 'ID' },
  { key: 'subject_id', header: 'Subject ID' },
  { key: 'subject_type', header: 'Subject Type' },
  { key: 'meaning_correct', header: 'Meaning Correct' },
  { key: 'meaning_incorrect', header: 'Meaning Incorrect' },
  { key: 'meaning_total', header: 'Meaning Total' },
  { key: 'meaning_accuracy_percent', header: 'Meaning Accuracy %' },
  { key: 'meaning_max_streak', header: 'Meaning Max Streak' },
  { key: 'meaning_current_streak', header: 'Meaning Current Streak' },
  { key: 'reading_correct', header: 'Reading Correct' },
  { key: 'reading_incorrect', header: 'Reading Incorrect' },
  { key: 'reading_total', header: 'Reading Total' },
  { key: 'reading_accuracy_percent', header: 'Reading Accuracy %' },
  { key: 'reading_max_streak', header: 'Reading Max Streak' },
  { key: 'reading_current_streak', header: 'Reading Current Streak' },
  { key: 'total_correct', header: 'Total Correct' },
  { key: 'total_incorrect', header: 'Total Incorrect' },
  { key: 'total_accuracy_percent', header: 'Total Accuracy %' },
  { key: 'leech_score', header: 'Leech Score' },
  { key: 'created_at', header: 'Created At' }
]

/**
 * Transform level progressions with computed fields
 */
export interface LevelProgressionExport {
  id: number
  level: number
  unlocked_at: string
  started_at: string
  passed_at: string
  completed_at: string
  abandoned_at: string
  days_to_complete: number | null
  is_completed: boolean
}

export function transformLevelProgressions(progressions: LevelProgression[]): LevelProgressionExport[] {
  return progressions.map(p => {
    const daysToComplete = p.data.completed_at && p.data.started_at
      ? daysBetween(p.data.started_at, p.data.completed_at)
      : null
    
    return {
      id: p.id,
      level: p.data.level,
      unlocked_at: p.data.unlocked_at || '',
      started_at: p.data.started_at || '',
      passed_at: p.data.passed_at || '',
      completed_at: p.data.completed_at || '',
      abandoned_at: p.data.abandoned_at || '',
      days_to_complete: daysToComplete,
      is_completed: !!p.data.completed_at
    }
  })
}

export const levelProgressionColumns = [
  { key: 'id', header: 'ID' },
  { key: 'level', header: 'Level' },
  { key: 'unlocked_at', header: 'Unlocked At' },
  { key: 'started_at', header: 'Started At' },
  { key: 'passed_at', header: 'Passed At' },
  { key: 'completed_at', header: 'Completed At' },
  { key: 'abandoned_at', header: 'Abandoned At' },
  { key: 'days_to_complete', header: 'Days to Complete' },
  { key: 'is_completed', header: 'Is Completed' }
]

/**
 * Transform subjects with computed fields
 */
export interface SubjectExport {
  id: number
  type: string
  level: number
  characters: string
  slug: string
  primary_meaning: string
  all_meanings: string
  primary_reading: string
  all_readings: string
  document_url: string
  created_at: string
}

export function transformSubjects(subjects: Subject[]): SubjectExport[] {
  return subjects.map(s => {
    const primaryMeaning = s.data.meanings.find(m => m.primary)?.meaning || s.data.meanings[0]?.meaning || ''
    const allMeanings = s.data.meanings.map(m => m.meaning).join('; ')
    const primaryReading = s.data.readings?.find(r => r.primary)?.reading || s.data.readings?.[0]?.reading || ''
    const allReadings = s.data.readings?.map(r => r.reading).join('; ') || ''
    
    return {
      id: s.id,
      type: s.object,
      level: s.data.level,
      characters: s.data.characters || s.data.slug || '',
      slug: s.data.slug || '',
      primary_meaning: primaryMeaning,
      all_meanings: allMeanings,
      primary_reading: primaryReading,
      all_readings: allReadings,
      document_url: s.data.document_url || '',
      created_at: s.data.created_at
    }
  })
}

export const subjectColumns = [
  { key: 'id', header: 'ID' },
  { key: 'type', header: 'Type' },
  { key: 'level', header: 'Level' },
  { key: 'characters', header: 'Characters' },
  { key: 'slug', header: 'Slug' },
  { key: 'primary_meaning', header: 'Primary Meaning' },
  { key: 'all_meanings', header: 'All Meanings' },
  { key: 'primary_reading', header: 'Primary Reading' },
  { key: 'all_readings', header: 'All Readings' },
  { key: 'document_url', header: 'Document URL' },
  { key: 'created_at', header: 'Created At' }
]

/**
 * Helper to delay between downloads
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate timestamp for filenames
 */
export function getTimestamp(): string {
  const now = new Date()
  return now.toISOString().split('T')[0] // YYYY-MM-DD format
}
