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
    <div className="wk-card rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text">
            Lesson Batching Helper
          </h2>
          <p className="text-sm text-wanikani-text-light">Match your lesson pace to upcoming reviews</p>
        </div>
        <div className="wk-card-pink rounded-lg p-3">
          <div className="text-white/80 text-xs">Recommended today</div>
          <div className="text-white font-bold text-xl">{recommendedLessons} lessons</div>
        </div>
      </div>

      {!summary ? (
        <div className="text-wanikani-text-light text-sm bg-gray-50 rounded-lg p-3">Summary data not loaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Lessons available</div>
            <div className="text-wanikani-radical font-bold text-lg">{lessonsAvailable}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Next reviews</div>
            <div className="text-wanikani-text font-bold text-lg">
              {nextReviewsAt ? new Date(nextReviewsAt).toLocaleTimeString() : 'None'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Reviews in 24h</div>
            <div className="text-wanikani-vocabulary font-bold text-lg">{reviewsNext24h}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Peak hour</div>
            <div className="text-wanikani-text font-bold text-lg">
              {peakHour ? `${new Date(peakHour.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Average'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
