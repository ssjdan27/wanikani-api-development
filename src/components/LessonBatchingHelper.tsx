'use client'

import { useMemo } from 'react'
import type { Summary } from '@/types/wanikani'

interface LessonBatchingHelperProps {
  summary: Summary | null
}

export default function LessonBatchingHelper({ summary }: LessonBatchingHelperProps) {
  const {
    lessonsAvailable,
    nextReviewsAt,
    reviewsNext24h,
    peakHour,
    recommendedLessons
  } = useMemo(() => {
    if (!summary) {
      return { lessonsAvailable: 0, nextReviewsAt: null, reviewsNext24h: 0, peakHour: null, recommendedLessons: 0 }
    }

    const lessonsAvailable = summary.data.lessons.reduce((sum, l) => sum + l.subject_ids.length, 0)
    const reviewsNext24h = summary.data.reviews.reduce((sum, r) => sum + r.subject_ids.length, 0)
    const peak = summary.data.reviews.reduce((best, r) => {
      const count = r.subject_ids.length
      if (!best || count > best.count) return { hour: r.available_at, count }
      return best
    }, null as null | { hour: string; count: number })

    // Simple heuristic: aim for ~150 reviews/day; a new lesson creates ~9 reviews over time
    const targetReviewsPerDay = 150
    const estimatedReviewsFromLessons = 9
    const headroom = Math.max(0, targetReviewsPerDay - reviewsNext24h)
    const recommendedLessons = Math.min(lessonsAvailable, Math.max(0, Math.round(headroom / estimatedReviewsFromLessons)))

    return {
      lessonsAvailable,
      nextReviewsAt: summary.data.next_reviews_at,
      reviewsNext24h,
      peakHour: peak,
      recommendedLessons
    }
  }, [summary])

  return (
    <div className="bg-wanikani-darker rounded-xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Lesson Batching Helper</h2>
          <p className="text-sm text-gray-400">Match your lesson pace to the next 24 hours of reviews.</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-sm">
          <div className="text-gray-400">Recommended lessons today</div>
          <div className="text-white font-semibold text-lg">{recommendedLessons}</div>
        </div>
      </div>

      {!summary ? (
        <div className="text-gray-300 text-sm">Summary data not loaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400">Lessons available</div>
            <div className="text-white font-semibold text-lg">{lessonsAvailable}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400">Next reviews</div>
            <div className="text-white font-semibold text-lg">
              {nextReviewsAt ? new Date(nextReviewsAt).toLocaleTimeString() : 'No reviews scheduled'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400">Reviews in next 24h</div>
            <div className="text-white font-semibold text-lg">{reviewsNext24h}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-gray-400">Peak hour</div>
            <div className="text-white font-semibold text-lg">
              {peakHour ? `${new Date(peakHour.hour).toLocaleTimeString()} (${peakHour.count} reviews)` : 'Evenly spread'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
