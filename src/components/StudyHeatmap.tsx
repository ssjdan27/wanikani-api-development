'use client'

import { useMemo, useState, useEffect } from 'react'
import type { Assignment, Review, UserData } from '@/types/wanikani'

interface StudyHeatmapProps {
  assignments: Assignment[]
  reviews: Review[]
  userData: UserData
}

type DayKey = string // yyyy-mm-dd

function toDayKey(value: string | Date): DayKey {
  const d = value instanceof Date ? value : new Date(value)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Color scale that adapts to the maximum volume
function getColor(total: number, maxTotal: number): string {
  if (total === 0) return 'bg-gray-800 border border-gray-700'
  if (maxTotal <= 4) return 'bg-blue-300'

  const step = Math.max(1, Math.floor(maxTotal / 4))
  if (total <= step) return 'bg-blue-900'
  if (total <= step * 2) return 'bg-blue-700'
  if (total <= step * 3) return 'bg-blue-500'
  return 'bg-blue-300'
}

export default function StudyHeatmap({ assignments, reviews, userData }: StudyHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Ensure the selected year is within the user's activity window
  useEffect(() => {
    const accountStartYear = new Date(userData.started_at).getFullYear()
    if (selectedYear < accountStartYear) {
      setSelectedYear(accountStartYear)
    }
  }, [userData.started_at, selectedYear])

  const {
    days,
    maxLessons,
    maxReviews,
    maxTotal,
    years,
    totalReviews
  } = useMemo(() => {
    const lessonsByDay = new Map<DayKey, number>()
    const reviewsByDay = new Map<DayKey, number>()
    let earliestDate = new Date(userData.started_at).getTime()

    assignments.forEach(a => {
      if (!a.data.started_at) return
      const key = toDayKey(a.data.started_at)
      lessonsByDay.set(key, (lessonsByDay.get(key) || 0) + 1)
      earliestDate = Math.min(earliestDate, new Date(a.data.started_at).getTime())
    })

    let totalReviews = 0
    reviews.forEach(r => {
      const createdAt = r.data.created_at || r.data_updated_at
      if (!createdAt) return
      const key = toDayKey(createdAt)
      reviewsByDay.set(key, (reviewsByDay.get(key) || 0) + 1)
      totalReviews += 1
      earliestDate = Math.min(earliestDate, new Date(createdAt).getTime())
    })

    const currentYear = new Date().getFullYear()
    const earliestYear = Number.isFinite(earliestDate) ? new Date(earliestDate).getFullYear() : currentYear
    const years: number[] = []
    for (let y = earliestYear; y <= currentYear; y++) {
      years.push(y)
    }
    if (years.length === 0) years.push(currentYear)

    // Build selected year range days
    const start = new Date(selectedYear, 0, 1)
    const today = new Date()
    const isCurrentYear = selectedYear === today.getFullYear()
    const end = isCurrentYear ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : new Date(selectedYear, 11, 31)

    const days: Array<{ date: Date; lessons: number; reviews: number }> = []
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
      const key = toDayKey(d)
      days.push({
        date: new Date(d),
        lessons: lessonsByDay.get(key) || 0,
        reviews: reviewsByDay.get(key) || 0,
      })
    }

    const maxLessons = Math.max(...days.map(d => d.lessons), 0)
    const maxReviews = Math.max(...days.map(d => d.reviews), 0)
    const maxTotal = Math.max(...days.map(d => d.lessons + d.reviews), 0)

    return { days, maxLessons, maxReviews, maxTotal, years, totalReviews }
  }, [assignments, reviews, selectedYear, userData.started_at])

  if (maxTotal === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-gray-300 text-sm">
        No study activity found for {selectedYear}. Try another year or confirm your token includes the all data scope (reviews loaded: {reviews.length}).
      </div>
    )
  }

  // Prepare grid cells (pad leading days to align weeks)
  const startDay = days[0]?.date.getDay() ?? 0
  const paddedDays = [
    ...Array.from({ length: startDay }, () => null),
    ...days,
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Study Heatmap</h2>
          <p className="text-sm text-gray-400">Hover to see daily lessons and reviews completed. Loaded {totalReviews.toLocaleString()} reviews.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>Less</span>
          <span className="w-4 h-4 rounded bg-gray-800 border border-gray-700" />
          <span className="w-4 h-4 rounded bg-blue-900" />
          <span className="w-4 h-4 rounded bg-blue-700" />
          <span className="w-4 h-4 rounded bg-blue-500" />
          <span className="w-4 h-4 rounded bg-blue-300" />
          <span>More</span>
        </div>
      </div>

      <div
        className="grid gap-1 overflow-x-auto pb-2"
        style={{
          gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(0, 1fr)',
        }}
      >
        {paddedDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="w-4 h-4 rounded bg-transparent" aria-hidden />
          }

          const total = day.lessons + day.reviews
          const label = `${day.date.toLocaleDateString()}\nLessons: ${day.lessons}\nReviews: ${day.reviews}`
          return (
            <div
              key={day.date.toISOString()}
              className={`w-4 h-4 rounded ${getColor(total, maxTotal)}`}
              title={label}
            />
          )
        })}
      </div>

      <div className="mt-4 text-sm text-gray-400 grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 mb-1">Max lessons in a day</div>
          <div className="text-white font-semibold">{maxLessons}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 mb-1">Max reviews in a day</div>
          <div className="text-white font-semibold">{maxReviews}</div>
        </div>
      </div>
    </div>
  )
}
