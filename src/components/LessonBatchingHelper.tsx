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
    <div className="wk-card rounded-2xl p-6 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical to-wanikani-vocabulary"></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="wk-gradient-text">Lesson Batching Helper</span>
            <span className="text-lg opacity-50 japanese-text">レッスン</span>
          </h2>
          <p className="text-sm text-gray-500">Match your lesson pace to upcoming reviews</p>
        </div>
        <div className="bg-gradient-to-br from-wanikani-kanji/20 to-wanikani-vocabulary/20 rounded-xl p-3 border border-wanikani-kanji/30">
          <div className="text-gray-400 text-xs">Recommended today</div>
          <div className="text-wanikani-sakura font-bold text-xl">{recommendedLessons} レッスン</div>
        </div>
      </div>

      {!summary ? (
        <div className="text-gray-400 text-sm bg-wanikani-darker/30 rounded-xl p-3">Summary data not loaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-wanikani-darker/50 rounded-xl p-3 border border-wanikani-radical/10 hover:border-wanikani-radical/30 transition-all">
            <div className="text-gray-500 text-xs">Lessons available</div>
            <div className="text-wanikani-radical font-bold text-lg">{lessonsAvailable}</div>
          </div>
          <div className="bg-wanikani-darker/50 rounded-xl p-3 border border-wanikani-kanji/10 hover:border-wanikani-kanji/30 transition-all">
            <div className="text-gray-500 text-xs">Next reviews</div>
            <div className="text-white font-bold text-lg">
              {nextReviewsAt ? new Date(nextReviewsAt).toLocaleTimeString() : 'なし'}
            </div>
          </div>
          <div className="bg-wanikani-darker/50 rounded-xl p-3 border border-wanikani-vocabulary/10 hover:border-wanikani-vocabulary/30 transition-all">
            <div className="text-gray-500 text-xs">Reviews in 24h</div>
            <div className="text-wanikani-vocabulary font-bold text-lg">{reviewsNext24h}</div>
          </div>
          <div className="bg-wanikani-darker/50 rounded-xl p-3 border border-wanikani-gold/10 hover:border-wanikani-gold/30 transition-all">
            <div className="text-gray-500 text-xs">Peak hour</div>
            <div className="text-wanikani-gold font-bold text-lg">
              {peakHour ? `${new Date(peakHour.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '平均'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
