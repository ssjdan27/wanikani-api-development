'use client'

import { useMemo } from 'react'
import type { ReviewStatistic, Subject } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface StreakAnalysisProps {
  reviewStats: ReviewStatistic[]
  subjects: Subject[]
}

type StreakItem = {
  subjectId: number
  label: string
  subjectType: 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'
  meaningCurrentStreak: number
  meaningMaxStreak: number
  readingCurrentStreak: number
  readingMaxStreak: number
  combinedCurrentStreak: number
  combinedMaxStreak: number
  link?: string
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

function getSubjectTypeBadge(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'radical': return t('common.radicals')
    case 'kanji': return t('common.kanji')
    case 'vocabulary':
    case 'kana_vocabulary': return t('common.vocabulary')
    default: return type
  }
}

export default function StreakAnalysis({ reviewStats, subjects }: StreakAnalysisProps) {
  const { t } = useLanguage()

  const { topCurrentStreaks, topMaxStreaks, stats } = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const items: StreakItem[] = []

    for (const stat of reviewStats) {
      if (stat.data.hidden) continue

      const subject = subjectById.get(stat.data.subject_id)
      if (!subject) continue

      const label = subject.data.characters || subject.data.slug
      if (!label) continue

      // Combined streak is the minimum of meaning and reading (if applicable)
      // For radicals, reading streak is 0, so we only count meaning
      const hasReading = stat.data.subject_type !== 'radical'
      const combinedCurrentStreak = hasReading
        ? Math.min(stat.data.meaning_current_streak, stat.data.reading_current_streak)
        : stat.data.meaning_current_streak
      const combinedMaxStreak = hasReading
        ? Math.min(stat.data.meaning_max_streak, stat.data.reading_max_streak)
        : stat.data.meaning_max_streak

      items.push({
        subjectId: stat.data.subject_id,
        label,
        subjectType: stat.data.subject_type,
        meaningCurrentStreak: stat.data.meaning_current_streak,
        meaningMaxStreak: stat.data.meaning_max_streak,
        readingCurrentStreak: stat.data.reading_current_streak,
        readingMaxStreak: stat.data.reading_max_streak,
        combinedCurrentStreak,
        combinedMaxStreak,
        link: subject.data.document_url
      })
    }

    // Sort by current streak (descending)
    const topCurrentStreaks = [...items]
      .filter(item => item.combinedCurrentStreak > 0)
      .sort((a, b) => b.combinedCurrentStreak - a.combinedCurrentStreak)
      .slice(0, 10)

    // Sort by max streak (descending)
    const topMaxStreaks = [...items]
      .filter(item => item.combinedMaxStreak > 0)
      .sort((a, b) => b.combinedMaxStreak - a.combinedMaxStreak)
      .slice(0, 10)

    // Calculate overall stats
    const totalItems = items.length
    const perfectStreakItems = items.filter(i => 
      i.meaningCurrentStreak === i.meaningMaxStreak && 
      i.meaningMaxStreak > 0 &&
      (i.subjectType === 'radical' || i.readingCurrentStreak === i.readingMaxStreak)
    ).length
    const avgCurrentStreak = totalItems > 0
      ? items.reduce((sum, i) => sum + i.combinedCurrentStreak, 0) / totalItems
      : 0
    const maxOverallStreak = items.reduce((max, i) => Math.max(max, i.combinedMaxStreak), 0)

    return {
      topCurrentStreaks,
      topMaxStreaks,
      stats: {
        totalItems,
        perfectStreakItems,
        avgCurrentStreak,
        maxOverallStreak
      }
    }
  }, [reviewStats, subjects])

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('streak.title')} 🔥
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('streak.subtitle')}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-2xl font-bold text-wanikani-pink">{stats.maxOverallStreak}</div>
          <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('streak.longestStreak')}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-2xl font-bold text-wanikani-cyan">{stats.avgCurrentStreak.toFixed(1)}</div>
          <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('streak.avgStreak')}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-2xl font-bold text-green-500">{stats.perfectStreakItems}</div>
          <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('streak.perfectItems')}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-2xl font-bold text-wanikani-text dark:text-wanikani-text-dark">{stats.totalItems}</div>
          <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('streak.totalReviewed')}</div>
        </div>
      </div>

      {topCurrentStreaks.length === 0 ? (
        <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-sm bg-gray-50 dark:bg-gray-800 border border-wanikani-border dark:border-wanikani-border-dark rounded-lg p-4">
          {t('streak.noData')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Hot Streaks */}
          <div>
            <h3 className="text-sm font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-3 flex items-center gap-2">
              <span>🔥</span> {t('streak.hotStreaks')}
            </h3>
            <div className="space-y-2">
              {topCurrentStreaks.map((item, index) => (
                <div
                  key={item.subjectId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark w-5">
                    {index + 1}.
                  </span>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-2 py-0.5 rounded text-white text-sm font-bold ${getSubjectTypeColor(item.subjectType)} hover:ring-2 hover:ring-wanikani-cyan/50 transition-all`}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-white text-sm font-bold ${getSubjectTypeColor(item.subjectType)}`}>
                      {item.label}
                    </span>
                  )}
                  <span className="flex-1" />
                  <div className="text-right">
                    <span className="text-lg font-bold text-orange-500">{item.combinedCurrentStreak}</span>
                    <span className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark ml-1">
                      {t('streak.inARow')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All-Time Best Streaks */}
          <div>
            <h3 className="text-sm font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-3 flex items-center gap-2">
              <span>🏆</span> {t('streak.bestStreaks')}
            </h3>
            <div className="space-y-2">
              {topMaxStreaks.map((item, index) => (
                <div
                  key={item.subjectId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark w-5">
                    {index + 1}.
                  </span>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-2 py-0.5 rounded text-white text-sm font-bold ${getSubjectTypeColor(item.subjectType)} hover:ring-2 hover:ring-wanikani-cyan/50 transition-all`}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-white text-sm font-bold ${getSubjectTypeColor(item.subjectType)}`}>
                      {item.label}
                    </span>
                  )}
                  <span className="flex-1" />
                  <div className="text-right">
                    <span className="text-lg font-bold text-yellow-500">{item.combinedMaxStreak}</span>
                    <span className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark ml-1">
                      {t('streak.record')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
