'use client'

import { useMemo, useState, useEffect } from 'react'
import type { Assignment, UserData } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface StudyHeatmapProps {
  assignments: Assignment[]
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

// Color scale that adapts to the maximum volume - Light WaniKani themed
function getColor(total: number, maxTotal: number): string {
  if (total === 0) return 'bg-gray-100 border border-gray-200'
  if (maxTotal <= 4) return 'bg-wanikani-pink'

  const step = Math.max(1, Math.floor(maxTotal / 4))
  if (total <= step) return 'bg-pink-200'
  if (total <= step * 2) return 'bg-pink-300'
  if (total <= step * 3) return 'bg-pink-400'
  return 'bg-wanikani-pink'
}

export default function StudyHeatmap({ assignments, userData }: StudyHeatmapProps) {
  const { t } = useLanguage()
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
    maxTotal,
    years,
    totalLessons
  } = useMemo(() => {
    const lessonsByDay = new Map<DayKey, number>()
    let earliestDate = new Date(userData.started_at).getTime()

    assignments.forEach(a => {
      if (!a.data.started_at) return
      const key = toDayKey(a.data.started_at)
      lessonsByDay.set(key, (lessonsByDay.get(key) || 0) + 1)
      earliestDate = Math.min(earliestDate, new Date(a.data.started_at).getTime())
    })

    const totalLessons = Array.from(lessonsByDay.values()).reduce((sum, count) => sum + count, 0)

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

    const days: Array<{ date: Date; lessons: number }> = []
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
      const key = toDayKey(d)
      days.push({
        date: new Date(d),
        lessons: lessonsByDay.get(key) || 0
      })
    }

    const maxLessons = Math.max(...days.map(d => d.lessons), 0)
    const maxTotal = maxLessons

    return { days, maxLessons, maxTotal, years, totalLessons }
  }, [assignments, selectedYear, userData.started_at])

  if (maxTotal === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-wanikani-border text-wanikani-text-light text-sm">
        {t('heatmap.noActivity').replace('{year}', String(selectedYear))}
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
          <h2 className="text-xl font-bold text-wanikani-text">
            {t('heatmap.title')}
          </h2>
          <p className="text-sm text-wanikani-text-light">{t('heatmap.subtitle').replace('{total}', totalLessons.toLocaleString())}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-white text-wanikani-text px-3 py-2 rounded-lg border border-wanikani-border focus:outline-none focus:ring-2 focus:ring-wanikani-pink/50 text-sm"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2 text-xs text-wanikani-text-light">
          <span>{t('heatmap.less')}</span>
          <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
          <span className="w-4 h-4 rounded bg-pink-200" />
          <span className="w-4 h-4 rounded bg-pink-300" />
          <span className="w-4 h-4 rounded bg-pink-400" />
          <span className="w-4 h-4 rounded bg-wanikani-pink" />
          <span>{t('heatmap.more')}</span>
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

          const total = day.lessons
          const label = `${day.date.toLocaleDateString()}\nLessons: ${day.lessons}`
          return (
            <div
              key={day.date.toISOString()}
              className={`w-4 h-4 rounded ${getColor(total, maxTotal)} hover:ring-2 hover:ring-wanikani-pink/50 transition-all`}
              title={label}
            />
          )
        })}
      </div>

      <div className="mt-4 text-sm grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border">
          <div className="text-wanikani-text-light text-xs mb-1">{t('heatmap.maxLessons')}</div>
          <div className="text-wanikani-pink font-bold">{maxLessons}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border">
          <div className="text-wanikani-text-light text-xs mb-1">{t('heatmap.totalLessons')}</div>
          <div className="text-wanikani-vocabulary font-bold">{totalLessons.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
