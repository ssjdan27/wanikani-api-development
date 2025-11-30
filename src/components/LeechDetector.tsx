'use client'

import { useMemo } from 'react'
import type { ReviewStatistic, Subject } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface LeechDetectorProps {
  reviewStats: ReviewStatistic[]
  subjects: Subject[]
}

type Leech = {
  subjectId: number
  label: string
  percentage: number
  incorrect: number
  link?: string
}

export default function LeechDetector({ reviewStats, subjects }: LeechDetectorProps) {
  const { t } = useLanguage()
  const leeches = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const result: Leech[] = []
    
    for (const stat of reviewStats) {
      if (stat.data.hidden) continue
      
      const subject = subjectById.get(stat.data.subject_id)
      if (!subject) continue // Skip items where subject data hasn't loaded yet
      
      const label = subject.data.characters || subject.data.slug
      if (!label) continue // Skip if we don't have a valid label
      
      const incorrect = stat.data.meaning_incorrect + stat.data.reading_incorrect
      const percentage = stat.data.percentage_correct
      
      // Only include leeches (low accuracy or many incorrect answers)
      if (percentage < 80 || incorrect >= 3) {
        result.push({
          subjectId: stat.data.subject_id,
          label,
          percentage,
          incorrect,
          link: subject.data.document_url
        })
      }
    }
    
    return result
      .sort((a, b) => (b.incorrect * (100 - b.percentage)) - (a.incorrect * (100 - a.percentage)))
      .slice(0, 10)
  }, [reviewStats, subjects])

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('leech.title')} 🦉
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('leech.subtitle')}</p>
        </div>
        <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('leech.topLeeches').replace('{count}', String(leeches.length))}</div>
      </div>

      {leeches.length === 0 ? (
        <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
          <span>✓</span>
          {t('leech.noLeeches')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-left border-b border-wanikani-border dark:border-wanikani-border-dark">
                <th className="pb-2">{t('leech.item')}</th>
                <th className="pb-2">{t('leech.accuracy')}</th>
                <th className="pb-2">{t('leech.incorrect')}</th>
              </tr>
            </thead>
            <tbody>
              {leeches.map(leech => (
                <tr key={leech.subjectId} className="border-t border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="py-2">
                    {leech.link ? (
                      <a
                        href={leech.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-wanikani-text dark:text-wanikani-text-dark font-semibold hover:ring-2 hover:ring-wanikani-cyan/50 rounded px-1 transition-all"
                      >
                        {leech.label}
                      </a>
                    ) : (
                      <span className="text-wanikani-text dark:text-wanikani-text-dark font-semibold">{leech.label}</span>
                    )}
                  </td>
                  <td className="py-2">
                    <span className={leech.percentage < 50 ? 'text-red-500' : leech.percentage < 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-wanikani-text dark:text-wanikani-text-dark'}>
                      {leech.percentage.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 text-red-500">{leech.incorrect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
