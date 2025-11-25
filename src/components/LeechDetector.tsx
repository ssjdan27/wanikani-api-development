'use client'

import { useMemo } from 'react'
import type { ReviewStatistic, Subject } from '@/types/wanikani'

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
  const leeches = useMemo<Leech[]>(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    return reviewStats
      .filter(stat => !stat.data.hidden)
      .map(stat => {
        const incorrect = stat.data.meaning_incorrect + stat.data.reading_incorrect
        const subject = subjectById.get(stat.data.subject_id)
        return {
          subjectId: stat.data.subject_id,
          label: subject?.data.characters || subject?.data.slug || `Item ${stat.data.subject_id}`,
          percentage: stat.data.percentage_correct,
          incorrect,
          link: subject?.data.document_url
        }
      })
      .filter(item => item.percentage < 80 || item.incorrect >= 3)
      .sort((a, b) => (b.incorrect * (100 - b.percentage)) - (a.incorrect * (100 - a.percentage)))
      .slice(0, 10)
  }, [reviewStats, subjects])

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text">
            Leech Detector 🦉
          </h2>
          <p className="text-sm text-wanikani-text-light">Items with low accuracy - drill these first</p>
        </div>
        <div className="text-sm text-wanikani-text-light">Top {leeches.length} leeches</div>
      </div>

      {leeches.length === 0 ? (
        <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <span>✓</span>
          No leeches detected yet. Great job! Keep it up!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-wanikani-text-light text-left border-b border-wanikani-border">
                <th className="pb-2">Item</th>
                <th className="pb-2">Accuracy</th>
                <th className="pb-2">Incorrect</th>
                <th className="pb-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {leeches.map(leech => (
                <tr key={leech.subjectId} className="border-t border-wanikani-border hover:bg-gray-50 transition-colors">
                  <td className="py-2 text-wanikani-text font-semibold">{leech.label}</td>
                  <td className="py-2">
                    <span className={leech.percentage < 50 ? 'text-red-500' : leech.percentage < 70 ? 'text-yellow-600' : 'text-wanikani-text'}>
                      {leech.percentage.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 text-red-500">{leech.incorrect}</td>
                  <td className="py-2">
                    {leech.link ? (
                      <a href={leech.link} target="_blank" rel="noreferrer" className="text-wanikani-cyan hover:text-wanikani-pink transition-colors">View</a>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
