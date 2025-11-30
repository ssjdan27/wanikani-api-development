'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import type { ReviewStatistic, Subject } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface AccuracyChartProps {
  reviewStats: ReviewStatistic[]
  subjects: Subject[]
}

export default function AccuracyChart({ reviewStats, subjects }: AccuracyChartProps) {
  const { t } = useLanguage()
  const { isDark } = useTheme()

  const { levelAccuracies, levels, overallByLevel } = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const visibleStats = reviewStats.filter(stat => !stat.data.hidden)

    // Group stats by level
    const levelData = new Map<number, { correct: number; incorrect: number }>()

    for (const stat of visibleStats) {
      const subject = subjectById.get(stat.data.subject_id)
      if (!subject) continue

      const level = subject.data.level
      const correct = stat.data.meaning_correct + stat.data.reading_correct
      const incorrect = stat.data.meaning_incorrect + stat.data.reading_incorrect

      const existing = levelData.get(level) || { correct: 0, incorrect: 0 }
      levelData.set(level, {
        correct: existing.correct + correct,
        incorrect: existing.incorrect + incorrect
      })
    }

    // Convert to sorted arrays
    const levels = Array.from(levelData.keys()).sort((a, b) => a - b)
    const levelAccuracies = levels.map(level => {
      const data = levelData.get(level)!
      const total = data.correct + data.incorrect
      return total > 0 ? (data.correct / total * 100) : 0
    })

    // Calculate stats for display
    const overallByLevel = levels.map(level => {
      const data = levelData.get(level)!
      const total = data.correct + data.incorrect
      const accuracy = total > 0 ? (data.correct / total * 100) : 0
      return { level, accuracy, total }
    })

    return { levelAccuracies, levels, overallByLevel }
  }, [reviewStats, subjects])

  // Find best and worst levels (with at least some reviews)
  const validLevels = overallByLevel.filter(l => l.total > 0)
  const bestLevel = validLevels.length > 0 
    ? validLevels.reduce((best, curr) => curr.accuracy > best.accuracy ? curr : best)
    : null
  const worstLevel = validLevels.length > 0
    ? validLevels.reduce((worst, curr) => curr.accuracy < worst.accuracy ? curr : worst)
    : null

  const data = {
    labels: levels.map(l => `${l}`),
    datasets: [
      {
        label: t('accuracy.accuracyPercent'),
        data: levelAccuracies,
        backgroundColor: levelAccuracies.map(acc => {
          if (acc >= 90) return 'rgba(34, 197, 94, 0.7)'  // green
          if (acc >= 80) return 'rgba(234, 179, 8, 0.7)'   // yellow
          if (acc >= 70) return 'rgba(249, 115, 22, 0.7)' // orange
          return 'rgba(239, 68, 68, 0.7)'                  // red
        }),
        borderColor: levelAccuracies.map(acc => {
          if (acc >= 90) return 'rgb(34, 197, 94)'
          if (acc >= 80) return 'rgb(234, 179, 8)'
          if (acc >= 70) return 'rgb(249, 115, 22)'
          return 'rgb(239, 68, 68)'
        }),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Level ${context[0].label}`,
          label: (context: any) => `Accuracy: ${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('accuracy.level'),
          color: isDark ? '#a0a0a0' : '#666666',
        },
        ticks: { 
          color: isDark ? '#a0a0a0' : '#666666',
          maxRotation: 0,
        },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
      },
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: t('accuracy.accuracyPercent'),
          color: isDark ? '#a0a0a0' : '#666666',
        },
        ticks: { 
          color: isDark ? '#a0a0a0' : '#666666',
          callback: (value: number | string) => `${value}%`
        },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
      }
    }
  }

  return (
    <div className="wk-card rounded-lg p-6">
      <h2 className="text-xl font-bold mb-2 text-wanikani-text dark:text-wanikani-text-dark">
        {t('accuracy.title')}
      </h2>
      <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mb-4">
        {t('accuracy.subtitle')}
      </p>
      
      {levels.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('accuracy.noData')}
        </div>
      ) : (
        <>
          <div className="h-64">
            <Bar data={data} options={options} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            {bestLevel && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-600 dark:text-green-400 mb-1">{t('accuracy.bestLevel')}</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  Lv {bestLevel.level}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {bestLevel.accuracy.toFixed(1)}%
                </div>
              </div>
            )}
            {worstLevel && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-600 dark:text-red-400 mb-1">{t('accuracy.worstLevel')}</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  Lv {worstLevel.level}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  {worstLevel.accuracy.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
