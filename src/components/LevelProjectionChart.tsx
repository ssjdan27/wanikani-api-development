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

export default function LevelProjectionChart({ userData, levelProgressions }: LevelProjectionChartProps) {
  const {
    actualPoints,
    projectionPoints,
    averageDaysPerLevel,
    level60Eta,
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

    const projectionPoints: { x: Date; y: number }[] = []
    let currentDate = projectionStartDate
    for (let level = startingLevel; level <= 60; level++) {
      currentDate = new Date(currentDate.getTime() + averageDurationMs)
      projectionPoints.push({
        x: currentDate,
        y: level,
      })
    }

    const level60Eta = projectionPoints.find(point => point.y === 60)?.x || actualPoints.find(point => point.y === 60)?.x

    const projectionStartLevel = projectionPoints[0]?.y ?? (lastActualLevel?.data.level || userData.level)
    const levelsRemaining = reachedLevel60
      ? 0
      : projectionStartLevel > 60
        ? 0
        : Math.max(60 - projectionStartLevel + 1, 0)

    return {
      actualPoints,
      projectionPoints,
      averageDaysPerLevel,
      level60Eta,
      sampleSize: recentDurations.length,
      latestDurationDays,
      projectionStartLevel,
      levelsRemaining,
    }
  }, [levelProgressions, userData.started_at, userData.level])

  const data = {
    datasets: [
      {
        label: 'Actual',
        data: actualPoints,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.25,
      },
      {
        label: 'Projected',
        data: projectionPoints,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
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
        labels: { color: '#e5e7eb' },
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
        ticks: { color: '#d1d5db' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        time: { unit: 'month' as const },
      },
      y: {
        ticks: { color: '#d1d5db', stepSize: 5 },
        grid: { color: 'rgba(255,255,255,0.05)' },
        suggestedMin: 1,
        suggestedMax: 60,
      },
    },
  }

  return (
    <div className="bg-wanikani-darker rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Level Up Projection</h2>
          <p className="text-sm text-gray-400">
            Based on your recent pace (last {sampleSize > 0 ? sampleSize : 5} levels or default 7-day pace).
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Average pace</div>
          <div className="text-lg font-semibold text-white">{averageDaysPerLevel.toFixed(1)} days/level</div>
          {level60Eta && (
            <div className="text-xs text-gray-400 mt-1">
              Level 60 ETA: {new Date(level60Eta).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="h-72">
        <Line data={data} options={options} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 mb-1">Latest completed level</div>
          <div className="text-white font-semibold">
            {latestDurationDays ? `${latestDurationDays.toFixed(1)} days` : 'Not enough data yet'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 mb-1">Projection start</div>
          <div className="text-white font-semibold">
            Level {projectionStartLevel}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 mb-1">Total to go</div>
          <div className="text-white font-semibold">
            {levelsRemaining} {levelsRemaining === 1 ? 'level' : 'levels'}
          </div>
        </div>
      </div>
    </div>
  )
}
