'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { Assignment, LevelProgression, UserData, Subject } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
)

interface BurnProjectionChartProps {
  assignments: Assignment[]
  levelProgressions: LevelProgression[]
  userData: UserData
  subjects: Subject[]
}

const DAY_MS = 1000 * 60 * 60 * 24
const MIN_BURN_DAYS_FROM_UNLOCK = 180 // ~6 months
const TOTAL_WK_ITEMS_APPROX = 9000
const LEVEL_COUNT = 60

export default function BurnProjectionChart({ assignments, levelProgressions, userData, subjects }: BurnProjectionChartProps) {
  const { t } = useLanguage()
  const {
    actualPoints,
    projectionPoints,
    impliedBurnRatePerDay,
    etaDate,
    burnedCount,
    totalBurnable,
    averageDaysPerLevel,
  } = useMemo(() => {
    const activeAssignments = assignments.filter(a => !a.data.hidden)
    const assignmentBySubject = new Map(activeAssignments.map(a => [a.data.subject_id, a]))
    const burnedAssignments = activeAssignments.filter(a => a.data.burned_at)

    // Per-level subject counts (known)
    const subjectsPerLevel = new Map<number, number>()
    subjects.forEach(s => {
      subjectsPerLevel.set(s.data.level, (subjectsPerLevel.get(s.data.level) || 0) + 1)
    })

    // Estimate per-level counts for missing levels so total ~9000
    const knownTotal = Array.from(subjectsPerLevel.values()).reduce((s, v) => s + v, 0)
    const missingLevels = Math.max(0, LEVEL_COUNT - subjectsPerLevel.size)
    const remainingItems = Math.max(TOTAL_WK_ITEMS_APPROX - knownTotal, 0)
    const fallbackPerLevel = missingLevels > 0 ? Math.max(120, Math.round(remainingItems / missingLevels)) : 150

    const targetPerLevel = new Map<number, number>()
    for (let lvl = 1; lvl <= LEVEL_COUNT; lvl++) {
      const count = subjectsPerLevel.get(lvl)
      targetPerLevel.set(lvl, count && count > 0 ? count : fallbackPerLevel)
    }

    const burnableCount = Array.from(targetPerLevel.values()).reduce((s, v) => s + v, 0)

    // Build cumulative actual data
    const burnByDay = new Map<string, number>()
    burnedAssignments.forEach(a => {
      const dateKey = new Date(a.data.burned_at!).toISOString().split('T')[0]
      burnByDay.set(dateKey, (burnByDay.get(dateKey) || 0) + 1)
    })

    const sortedDates = Array.from(burnByDay.keys()).sort()
    let cumulative = 0
    const actualPoints = sortedDates.map(date => {
      cumulative += burnByDay.get(date) || 0
      return { x: new Date(date), y: cumulative }
    })

    // Calculate average level duration (use recent 5)
    const completedLevels = levelProgressions
      .filter(lp => lp.data.passed_at)
      .sort((a, b) => a.data.level - b.data.level)

    const levelDurations = completedLevels.map((lp, idx) => {
      const start = lp.data.unlocked_at || lp.data.started_at || lp.data.passed_at
      const end = lp.data.passed_at!
      const previousPassed = completedLevels[idx - 1]?.data.passed_at
      const startDate = start || previousPassed || userData.started_at
      return (new Date(end).getTime() - new Date(startDate).getTime()) / DAY_MS
    }).filter(d => d > 0)

    const recentDurations = levelDurations.slice(-5)
    const averageDaysPerLevel = recentDurations.length
      ? recentDurations.reduce((s, d) => s + d, 0) / recentDurations.length
      : 9 // fallback

    // Build projected unlock dates per level (actual for completed, projected for future)
    const levelUnlockDates = new Map<number, Date>()
    completedLevels.forEach(lp => {
      const unlock = lp.data.unlocked_at || lp.data.started_at || lp.data.passed_at
      if (unlock) levelUnlockDates.set(lp.data.level, new Date(unlock))
    })

    const maxLevel = LEVEL_COUNT

    let lastLevel = Math.max(...Array.from(levelUnlockDates.keys()), userData.level)
    let lastDate = levelUnlockDates.get(lastLevel) || new Date()
    for (let lvl = lastLevel + 1; lvl <= maxLevel; lvl++) {
      lastDate = new Date(lastDate.getTime() + averageDaysPerLevel * DAY_MS)
      levelUnlockDates.set(lvl, lastDate)
    }

    // Calculate projected burn dates (unlock date + minimum burn window)
    const projectedBurnCountsByDay = new Map<string, number>()

    // Existing subjects we know
    subjects.forEach(subject => {
      const assignment = assignmentBySubject.get(subject.id)
      if (assignment?.data.burned_at) return

      const unlocked = assignment?.data.unlocked_at || levelUnlockDates.get(subject.data.level) || userData.started_at
      const unlockedDate = new Date(unlocked)
      const burnDate = new Date(unlockedDate.getTime() + MIN_BURN_DAYS_FROM_UNLOCK * DAY_MS)
      const key = burnDate.toISOString().split('T')[0]
      projectedBurnCountsByDay.set(key, (projectedBurnCountsByDay.get(key) || 0) + 1)
    })

    // Placeholder items for levels we don't have subject data for
    for (let lvl = 1; lvl <= LEVEL_COUNT; lvl++) {
      const knownCount = subjectsPerLevel.get(lvl) || 0
      const targetCount = targetPerLevel.get(lvl) || 0
      const placeholders = Math.max(targetCount - knownCount, 0)
      if (placeholders === 0) continue

      const unlockDate = levelUnlockDates.get(lvl) || new Date()
      const burnDate = new Date(unlockDate.getTime() + MIN_BURN_DAYS_FROM_UNLOCK * DAY_MS)
      const key = burnDate.toISOString().split('T')[0]
      projectedBurnCountsByDay.set(key, (projectedBurnCountsByDay.get(key) || 0) + placeholders)
    }

    // Combine actual + projected for projection line
    const projectionByDay = new Map<string, number>()
    projectedBurnCountsByDay.forEach((count, dateKey) => {
      projectionByDay.set(dateKey, (projectionByDay.get(dateKey) || 0) + count)
    })

    const projectionDates = Array.from(projectionByDay.keys())
    const burnDates = Array.from(burnByDay.keys())
    const allProjectionDates = Array.from(new Set([...projectionDates, ...burnDates])).sort()
    let projectedCumulative = burnedAssignments.length
    const today = new Date()
    const projectionPoints = [{ x: today, y: burnedAssignments.length }]
    allProjectionDates.forEach(date => {
      if (new Date(date) < today) return
      projectedCumulative += (projectionByDay.get(date) || 0)
      projectionPoints.push({ x: new Date(date), y: Math.min(projectedCumulative, burnableCount) })
    })

    const etaDate = projectionPoints.length ? projectionPoints[projectionPoints.length - 1].x : null

    const remaining = Math.max(burnableCount - burnedAssignments.length, 0)
    const impliedBurnRatePerDay = etaDate
      ? remaining / Math.max(1, (etaDate.getTime() - today.getTime()) / DAY_MS)
      : 0

    return {
      actualPoints,
      projectionPoints,
      impliedBurnRatePerDay,
      etaDate,
      burnedCount: burnedAssignments.length,
      totalBurnable: burnableCount,
      averageDaysPerLevel,
    }
  }, [assignments, levelProgressions, userData, subjects])

  const data = {
    datasets: [
      {
        label: t('burnProjection.actualLabel'),
        data: actualPoints,
        borderColor: '#434343',
        backgroundColor: 'rgba(67,67,67,0.3)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.25,
      },
      {
        label: t('burnProjection.projectedLabel'),
        data: projectionPoints,
        borderColor: '#daa520',
        backgroundColor: 'rgba(218,165,32,0.15)',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#333333' },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const date = new Date(context.parsed.x).toLocaleDateString()
            return `${context.parsed.y} burned by ${date}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        ticks: { color: '#666666' },
        grid: { color: 'rgba(0,0,0,0.05)' },
        time: { unit: 'month' as const },
      },
      y: {
        ticks: { color: '#666666' },
        grid: { color: 'rgba(0,0,0,0.05)' },
        suggestedMin: 0,
    suggestedMax: Math.max(totalBurnable, burnedCount + 10),
  },
},
}

  const notEnoughData = projectionPoints.length === 0 || totalBurnable === 0

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('burnProjection.title')} 🔥
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('burnProjection.basedOnPace').replace('{days}', averageDaysPerLevel.toFixed(1))}
          </p>
        </div>
        <div className="text-right text-sm space-y-1">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('burnProjection.totalBurnable')}: <span className="text-wanikani-text dark:text-wanikani-text-dark font-bold">{totalBurnable.toLocaleString()}</span></div>
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('burnProjection.burnedSoFar')}: <span className="text-gray-600 dark:text-gray-400 font-bold">{burnedCount.toLocaleString()}</span></div>
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('burnProjection.burnRate')}: <span className="text-wanikani-pink font-bold">{impliedBurnRatePerDay.toFixed(2)}/{t('common.day')}</span></div>
          {etaDate && (
            <div className="text-xs text-wanikani-cyan font-medium">{t('burnProjection.eta')}: {etaDate.toLocaleDateString()}</div>
          )}
        </div>
      </div>

      {notEnoughData ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-wanikani-border dark:border-wanikani-border-dark text-wanikani-text-light dark:text-wanikani-text-light-dark text-sm">
          {t('burnProjection.noData')}
        </div>
      ) : (
        <div className="h-72">
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  )
}
