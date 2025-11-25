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
    <div className="wk-card rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-apprentice to-wanikani-kanji"></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="wk-gradient-text">Leech Detector</span>
            <span className="text-lg opacity-50 japanese-text">🦉</span>
          </h2>
          <p className="text-sm text-gray-500">Items with low accuracy - drill these first</p>
        </div>
        <div className="text-sm text-gray-400">Top {leeches.length} leeches</div>
      </div>

      {leeches.length === 0 ? (
        <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
          <span>✨</span>
          No leeches detected yet. すごい！ Keep it up!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-wanikani-kanji/10">
                <th className="pb-2">アイテム</th>
                <th className="pb-2">Accuracy</th>
                <th className="pb-2">Incorrect</th>
                <th className="pb-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {leeches.map(leech => (
                <tr key={leech.subjectId} className="border-t border-wanikani-kanji/10 hover:bg-wanikani-darker/30 transition-colors">
                  <td className="py-2 text-white font-semibold wk-kanji">{leech.label}</td>
                  <td className="py-2">
                    <span className={leech.percentage < 50 ? 'text-wanikani-kanji' : leech.percentage < 70 ? 'text-wanikani-gold' : 'text-gray-300'}>
                      {leech.percentage.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 text-wanikani-apprentice">{leech.incorrect}</td>
                  <td className="py-2">
                    {leech.link ? (
                      <a href={leech.link} target="_blank" rel="noreferrer" className="text-wanikani-radical hover:text-wanikani-kanji transition-colors">見る</a>
                    ) : (
                      <span className="text-gray-600">N/A</span>
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
