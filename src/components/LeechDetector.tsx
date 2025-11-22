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
    <div className="bg-wanikani-darker rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Leech Detector</h2>
          <p className="text-sm text-gray-400">Items with low accuracy or many misses. Drill these first.</p>
        </div>
        <div className="text-sm text-gray-400">Top {leeches.length} leeches</div>
      </div>

      {leeches.length === 0 ? (
        <div className="text-green-300 text-sm">No leeches detected yet. Keep it up!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="pb-2">Item</th>
                <th className="pb-2">Accuracy</th>
                <th className="pb-2">Incorrect</th>
                <th className="pb-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {leeches.map(leech => (
                <tr key={leech.subjectId} className="border-t border-gray-800">
                  <td className="py-2 text-white font-semibold">{leech.label}</td>
                  <td className="py-2 text-gray-200">{leech.percentage.toFixed(0)}%</td>
                  <td className="py-2 text-gray-200">{leech.incorrect}</td>
                  <td className="py-2">
                    {leech.link ? (
                      <a href={leech.link} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">View</a>
                    ) : (
                      <span className="text-gray-500">N/A</span>
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
