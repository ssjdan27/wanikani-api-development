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
import type { LevelProgression, UserData } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
)

interface LevelProjectionChartProps {
  userData: UserData
  levelProgressions: LevelProgression[]
}

const DAY_MS = 1000 * 60 * 60 * 24
const MIN_DAYS_PER_LEVEL = 3.5 // Theoretical minimum based on SRS intervals

// Pace multipliers
const FAST_MULTIPLIER = 0.7
const SLOW_MULTIPLIER = 1.5

// Helper to generate projection points
function generateProjectionPoints(
  startDate: Date,
  startingLevel: number,
  daysPerLevel: number
): { x: Date; y: number }[] {
  const points: { x: Date; y: number }[] = []
  const durationMs = daysPerLevel * DAY_MS
  let currentDate = startDate
  
  for (let level = startingLevel; level <= 60; level++) {
    currentDate = new Date(currentDate.getTime() + durationMs)
    points.push({ x: currentDate, y: level })
  }
  
  return points
}

export default function LevelProjectionChart({ userData, levelProgressions }: LevelProjectionChartProps) {
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const {
    actualPoints,
    fastProjectionPoints,
    avgProjectionPoints,
    slowProjectionPoints,
    fastDaysPerLevel,
    averageDaysPerLevel,
    slowDaysPerLevel,
    fastEta,
    avgEta,
    slowEta,
    sampleSize,
    latestDurationDays,
    projectionStartLevel,
    levelsRemaining,
  } = useMemo(() => {
    const completedLevels = levelProgressions
      .filter(lp => lp.data.passed_at)
      .sort((a, b) => a.data.level - b.data.level)

    const reachedLevel60 = completedLevels.some(lp => lp.data.level === 60 && lp.data.passed_at)

    // Derive durations between level unlock/start and level-up (passed_at)
    const durationsMs: number[] = completedLevels.map((progression, index) => {
      const startReference = progression.data.unlocked_at || progression.data.started_at
      const previousPassed = completedLevels[index - 1]?.data.passed_at
      const startDate = startReference || previousPassed || userData.started_at
      const endDate = progression.data.passed_at!
      return new Date(endDate).getTime() - new Date(startDate).getTime()
    }).filter(duration => duration > 0)

    const recentDurations = durationsMs.slice(-5)
    const averageDurationMs = recentDurations.length > 0
      ? recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length
      : 7 * DAY_MS // fallback pace

    const averageDaysPerLevel = averageDurationMs / DAY_MS
    const fastDaysPerLevel = Math.max(averageDaysPerLevel * FAST_MULTIPLIER, MIN_DAYS_PER_LEVEL)
    const slowDaysPerLevel = averageDaysPerLevel * SLOW_MULTIPLIER
    const latestDurationDays = durationsMs.length > 0 ? durationsMs[durationsMs.length - 1] / DAY_MS : null

    const actualPoints = completedLevels.map(lp => ({
      x: new Date(lp.data.passed_at!),
      y: lp.data.level,
    }))

    const lastActualLevel = completedLevels[completedLevels.length - 1]
    const projectionStartDate = new Date(
      lastActualLevel?.data.passed_at || userData.started_at
    )
    const startingLevel = Math.max(
      (lastActualLevel?.data.level || 0) + 1,
      userData.level
    )

    // Generate all three projection lines
    const fastProjectionPoints = generateProjectionPoints(projectionStartDate, startingLevel, fastDaysPerLevel)
    const avgProjectionPoints = generateProjectionPoints(projectionStartDate, startingLevel, averageDaysPerLevel)
    const slowProjectionPoints = generateProjectionPoints(projectionStartDate, startingLevel, slowDaysPerLevel)

    // Get Level 60 ETAs
    const fastEta = fastProjectionPoints.find(p => p.y === 60)?.x || actualPoints.find(p => p.y === 60)?.x
    const avgEta = avgProjectionPoints.find(p => p.y === 60)?.x || actualPoints.find(p => p.y === 60)?.x
    const slowEta = slowProjectionPoints.find(p => p.y === 60)?.x || actualPoints.find(p => p.y === 60)?.x

    const projectionStartLevel = avgProjectionPoints[0]?.y ?? (lastActualLevel?.data.level || userData.level)
    const levelsRemaining = reachedLevel60
      ? 0
      : projectionStartLevel > 60
        ? 0
        : Math.max(60 - projectionStartLevel + 1, 0)

    return {
      actualPoints,
      fastProjectionPoints,
      avgProjectionPoints,
      slowProjectionPoints,
      fastDaysPerLevel,
      averageDaysPerLevel,
      slowDaysPerLevel,
      fastEta,
      avgEta,
      slowEta,
      sampleSize: recentDurations.length,
      latestDurationDays,
      projectionStartLevel,
      levelsRemaining,
    }
  }, [levelProgressions, userData.started_at, userData.level])

  const data = {
    datasets: [
      {
        label: t('projection.actual'),
        data: actualPoints,
        borderColor: '#00aaff',
        backgroundColor: 'rgba(0,170,255,0.2)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.25,
      },
      {
        label: t('projection.fastPace'),
        data: fastProjectionPoints,
        borderColor: '#00cc66',
        backgroundColor: 'rgba(0,204,102,0.1)',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 2,
        tension: 0.25,
      },
      {
        label: t('projection.projected'),
        data: avgProjectionPoints,
        borderColor: '#ff00aa',
        backgroundColor: 'rgba(255,0,170,0.1)',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 2,
        tension: 0.25,
      },
      {
        label: t('projection.slowPace'),
        data: slowProjectionPoints,
        borderColor: '#ff6600',
        backgroundColor: 'rgba(255,102,0,0.1)',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 2,
        tension: 0.25,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: isDark ? '#e0e0e0' : '#333333' },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const date = new Date(context.parsed.x).toLocaleDateString()
            return `Level ${context.parsed.y}: ${date}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        ticks: { color: isDark ? '#a0a0a0' : '#666666' },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
        time: { unit: 'month' as const },
      },
      y: {
        ticks: { color: isDark ? '#a0a0a0' : '#666666', stepSize: 5 },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
        suggestedMin: 1,
        suggestedMax: 60,
      },
    },
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('projection.title')}
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('projection.basedOnPace').replace('{count}', String(sampleSize > 0 ? sampleSize : 5))}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mb-1">{t('projection.paceComparison')}</div>
          <div className="flex gap-3 text-xs font-medium">
            <span className="text-green-500">{t('projection.fastPace')}: {fastDaysPerLevel.toFixed(1)}d</span>
            <span className="text-wanikani-pink">{t('projection.avgPace')}: {averageDaysPerLevel.toFixed(1)}d</span>
            <span className="text-orange-500">{t('projection.slowPace')}: {slowDaysPerLevel.toFixed(1)}d</span>
          </div>
          {avgEta && (
            <div className="mt-2 text-xs space-y-0.5">
              <div className="text-green-500">{t('projection.level60Eta')}: {new Date(fastEta!).toLocaleDateString()}</div>
              <div className="text-wanikani-pink">{t('projection.level60Eta')}: {new Date(avgEta).toLocaleDateString()}</div>
              <div className="text-orange-500">{t('projection.level60Eta')}: {new Date(slowEta!).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="h-72">
        <Line data={data} options={options} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">{t('projection.latestLevel')}</div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold">
            {latestDurationDays ? `${latestDurationDays.toFixed(1)} ${t('common.days')}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">{t('projection.projectionStart')}</div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold">
            {t('common.level')} {projectionStartLevel}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">{t('projection.totalToGo')}</div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold">
            {levelsRemaining} {levelsRemaining === 1 ? t('common.level').toLowerCase() : t('projection.levels')}
          </div>
        </div>
      </div>
    </div>
  )
}
