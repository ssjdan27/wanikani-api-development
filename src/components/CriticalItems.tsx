'use client'

import { useMemo } from 'react'
import type { Assignment, Subject, SpacedRepetitionSystem } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface CriticalItemsProps {
  assignments: Assignment[]
  subjects: Subject[]
  srsSystems: SpacedRepetitionSystem[]
}

type CriticalItem = {
  subjectId: number
  label: string
  subjectType: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
  currentStage: number
  stageName: string
  wasAtStage: number
  wasAtStageName: string
  droppedStages: number
  availableAt: Date | null
  link?: string
}

// SRS stage names
const SRS_STAGES = [
  'Locked',
  'Apprentice 1',
  'Apprentice 2', 
  'Apprentice 3',
  'Apprentice 4',
  'Guru 1',
  'Guru 2',
  'Master',
  'Enlightened',
  'Burned'
]

function getStageName(stage: number): string {
  return SRS_STAGES[stage] || `Stage ${stage}`
}

function getStageColor(stage: number): string {
  if (stage === 0) return 'text-gray-400'
  if (stage <= 4) return 'text-wanikani-apprentice'
  if (stage <= 6) return 'text-wanikani-guru'
  if (stage === 7) return 'text-wanikani-master'
  if (stage === 8) return 'text-wanikani-enlightened'
  return 'text-wanikani-burned'
}

function getSubjectTypeColor(type: string): string {
  switch (type) {
    case 'radical': return 'bg-wanikani-radical'
    case 'kanji': return 'bg-wanikani-kanji'
    case 'vocabulary':
    case 'kana_vocabulary': return 'bg-wanikani-vocabulary'
    default: return 'bg-gray-500'
  }
}

function getUrgencyColor(droppedStages: number): string {
  if (droppedStages >= 4) return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
  if (droppedStages >= 2) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
  return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
}

export default function CriticalItems({ assignments, subjects, srsSystems }: CriticalItemsProps) {
  const { t } = useLanguage()

  const criticalItems = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const items: CriticalItem[] = []

    for (const assignment of assignments) {
      if (assignment.data.hidden) continue
      if (assignment.data.burned_at) continue // Skip burned items
      if (!assignment.data.started_at) continue // Skip not started items

      const subject = subjectById.get(assignment.data.subject_id)
      if (!subject) continue

      const label = subject.data.characters || subject.data.slug
      if (!label) continue

      const currentStage = assignment.data.srs_stage

      // Determine if item has "dropped" - was at a higher stage before
      // We can infer this from passed_at: if passed (was at Guru+) but now back in Apprentice
      const wasPassed = assignment.data.passed_at !== undefined && assignment.data.passed_at !== null
      
      // An item is "critical" if:
      // 1. It was passed (reached Guru) but is now back in Apprentice stages (1-4)
      // 2. OR it's been resurrected (was burned, now back)
      
      let isCritical = false
      let wasAtStage = currentStage
      let droppedStages = 0

      if (assignment.data.resurrected_at) {
        // Resurrected items - they were at stage 9 (burned)
        isCritical = true
        wasAtStage = 9
        droppedStages = 9 - currentStage
      } else if (wasPassed && currentStage <= 4) {
        // Was passed (Guru+, stage 5+) but now back in Apprentice
        isCritical = true
        wasAtStage = 5 // At minimum was at Guru 1
        droppedStages = wasAtStage - currentStage
      }

      if (isCritical) {
        items.push({
          subjectId: assignment.data.subject_id,
          label,
          subjectType: assignment.data.subject_type,
          currentStage,
          stageName: getStageName(currentStage),
          wasAtStage,
          wasAtStageName: getStageName(wasAtStage),
          droppedStages,
          availableAt: assignment.data.available_at ? new Date(assignment.data.available_at) : null,
          link: subject.data.document_url
        })
      }
    }

    // Sort by most dropped stages first, then by lowest current stage
    return items
      .sort((a, b) => {
        if (b.droppedStages !== a.droppedStages) return b.droppedStages - a.droppedStages
        return a.currentStage - b.currentStage
      })
      .slice(0, 15)
  }, [assignments, subjects])

  const stats = useMemo(() => {
    const resurrected = criticalItems.filter(i => i.wasAtStage === 9).length
    const droppedFromGuru = criticalItems.filter(i => i.wasAtStage >= 5 && i.wasAtStage < 9).length
    const avgDrop = criticalItems.length > 0
      ? criticalItems.reduce((sum, i) => sum + i.droppedStages, 0) / criticalItems.length
      : 0

    return { resurrected, droppedFromGuru, avgDrop, total: criticalItems.length }
  }, [criticalItems])

  const formatTimeUntilReview = (availableAt: Date | null): string => {
    if (!availableAt) return t('critical.now')
    
    const now = new Date()
    const diff = availableAt.getTime() - now.getTime()
    
    if (diff <= 0) return t('critical.now')
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}${t('common.day')}`
    }
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('critical.title')} ⚠️
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('critical.subtitle')}
          </p>
        </div>
        <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('critical.count').replace('{count}', String(stats.total))}
        </div>
      </div>

      {criticalItems.length === 0 ? (
        <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
          <span>✓</span>
          {t('critical.noCritical')}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.resurrected}</div>
              <div className="text-xs text-red-600 dark:text-red-400">{t('critical.resurrected')}</div>
            </div>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-center">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.droppedFromGuru}</div>
              <div className="text-xs text-orange-600 dark:text-orange-400">{t('critical.droppedGuru')}</div>
            </div>
            <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-center">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.avgDrop.toFixed(1)}</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">{t('critical.avgDrop')}</div>
            </div>
          </div>

          {/* Critical Items List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {criticalItems.map(item => (
              <div
                key={item.subjectId}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${getUrgencyColor(item.droppedStages)}`}
              >
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-2 py-0.5 rounded text-white text-sm font-bold shrink-0 ${getSubjectTypeColor(item.subjectType)} hover:ring-2 hover:ring-wanikani-cyan/50 transition-all`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-white text-sm font-bold shrink-0 ${getSubjectTypeColor(item.subjectType)}`}>
                    {item.label}
                  </span>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span className={`font-medium ${getStageColor(item.wasAtStage)}`}>
                      {item.wasAtStageName}
                    </span>
                    <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">→</span>
                    <span className={`font-medium ${getStageColor(item.currentStage)}`}>
                      {item.stageName}
                    </span>
                    <span className="text-red-500 text-xs ml-1">
                      (-{item.droppedStages})
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">
                    {t('critical.nextReview')}
                  </div>
                  <div className="text-sm font-medium text-wanikani-text dark:text-wanikani-text-dark">
                    {formatTimeUntilReview(item.availableAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
