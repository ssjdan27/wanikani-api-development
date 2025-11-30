'use client'

import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { Assignment, Summary } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface ReviewForecastProps {
  assignments: Assignment[]
  summary: Summary | null
}

// Workload thresholds
const THRESHOLD_MEDIUM = 150
const THRESHOLD_HIGH = 250

// Get bar color based on review count
function getBarColor(count: number): string {
  if (count >= THRESHOLD_HIGH) return 'rgba(239, 68, 68, 0.8)' // red
  if (count >= THRESHOLD_MEDIUM) return 'rgba(249, 115, 22, 0.8)' // orange
  return 'rgba(0, 170, 255, 0.8)' // cyan
}

function getBorderColor(count: number): string {
  if (count >= THRESHOLD_HIGH) return '#ef4444'
  if (count >= THRESHOLD_MEDIUM) return '#f97316'
  return '#00aaff'
}

// Format date as "Mon 12/2"
function formatDateLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
}

// Get start of day (midnight) for a date
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ReviewForecast({ assignments, summary }: ReviewForecastProps) {
  const { t } = useLanguage()
  const { isDark } = useTheme()

  const {
    dailyCounts,
    overdueCount,
    todayCount,
    weekTotal,
    peakDay,
    peakCount,
    dailyAvg,
    labels
  } = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    
    // Initialize counts for next 7 days
    const dailyCounts: number[] = Array(7).fill(0)
    const labels: string[] = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(todayStart)
      date.setDate(date.getDate() + i)
      labels.push(formatDateLabel(date))
    }

    let overdueCount = 0

    // Count reviews from assignments based on available_at
    assignments.forEach(a => {
      if (a.data.hidden || a.data.srs_stage === 9 || !a.data.available_at) return
      
      const availableAt = new Date(a.data.available_at)
      const availableStart = startOfDay(availableAt)
      
      // Check if overdue (available before today)
      if (availableAt < now && availableStart < todayStart) {
        overdueCount++
        // Add overdue to today's count
        dailyCounts[0]++
        return
      }
      
      // Check if available today but in the past
      if (availableAt < now) {
        dailyCounts[0]++
        return
      }
      
      // Calculate days from today
      const daysFromToday = Math.floor((availableStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))
      
      if (daysFromToday >= 0 && daysFromToday < 7) {
        dailyCounts[daysFromToday]++
      }
    })

    const todayCount = dailyCounts[0]
    const weekTotal = dailyCounts.reduce((sum, count) => sum + count, 0)
    const dailyAvg = Math.round(weekTotal / 7)
    
    // Find peak day
    let peakCount = 0
    let peakDayIndex = 0
    dailyCounts.forEach((count, index) => {
      if (count > peakCount) {
        peakCount = count
        peakDayIndex = index
      }
    })
    
    const peakDate = new Date(todayStart)
    peakDate.setDate(peakDate.getDate() + peakDayIndex)
    const peakDay = formatDateLabel(peakDate)

    return {
      dailyCounts,
      overdueCount,
      todayCount,
      weekTotal,
      peakDay,
      peakCount,
      dailyAvg,
      labels
    }
  }, [assignments])

  const data = {
    labels,
    datasets: [
      {
        label: t('forecast.reviews'),
        data: dailyCounts,
        backgroundColor: dailyCounts.map(getBarColor),
        borderColor: dailyCounts.map(getBorderColor),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const count = context.parsed.y
            let label = `${count} ${t('forecast.reviews')}`
            if (count >= THRESHOLD_HIGH) {
              label += ` ⚠️ ${t('forecast.heavyWorkload')}`
            } else if (count >= THRESHOLD_MEDIUM) {
              label += ` 📈 ${t('forecast.busyDay')}`
            }
            return label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: isDark ? '#a0a0a0' : '#666666' },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
      },
      y: {
        ticks: { color: isDark ? '#a0a0a0' : '#666666' },
        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
        beginAtZero: true
      }
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('forecast.title')}
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('forecast.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400">
            &lt;{THRESHOLD_MEDIUM}
          </span>
          <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
            {THRESHOLD_MEDIUM}-{THRESHOLD_HIGH}
          </span>
          <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
            &gt;{THRESHOLD_HIGH}
          </span>
        </div>
      </div>

      <div className="h-64 mb-4">
        <Bar data={data} options={options} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">
            {t('forecast.today')}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-wanikani-text dark:text-wanikani-text-dark font-bold text-lg">
              {todayCount}
            </span>
            {overdueCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                {overdueCount} {t('forecast.overdue')}
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">
            {t('forecast.thisWeek')}
          </div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold text-lg">
            {weekTotal}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">
            {t('forecast.peakDay')}
          </div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold">
            {peakDay}
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark font-normal text-sm ml-1">
              ({peakCount})
            </span>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark">
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs mb-1">
            {t('forecast.dailyAvg')}
          </div>
          <div className="text-wanikani-text dark:text-wanikani-text-dark font-bold text-lg">
            {dailyAvg}
          </div>
        </div>
      </div>
    </div>
  )
}
