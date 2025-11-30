'use client'

import { useMemo, useState, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { ArrowLeft } from 'lucide-react'
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
  const chartRef = useRef<any>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Calculate hourly data for a specific day
  const getHourlyData = (dayIndex: number) => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const targetDate = new Date(todayStart)
    targetDate.setDate(targetDate.getDate() + dayIndex)
    const targetEnd = new Date(targetDate)
    targetEnd.setDate(targetEnd.getDate() + 1)

    const hourlyCounts: number[] = Array(24).fill(0)

    assignments.forEach(a => {
      if (a.data.hidden || a.data.srs_stage === 9 || !a.data.available_at) return

      const availableAt = new Date(a.data.available_at)

      // For today (dayIndex 0), include overdue items in current hour
      if (dayIndex === 0 && availableAt < now) {
        const currentHour = now.getHours()
        hourlyCounts[currentHour]++
        return
      }

      // Check if within target day
      if (availableAt >= targetDate && availableAt < targetEnd) {
        hourlyCounts[availableAt.getHours()]++
      }
    })

    return hourlyCounts
  }

  const {
    dailyCounts,
    overdueCount,
    todayCount,
    weekTotal,
    peakDay,
    peakCount,
    dailyAvg,
    labels,
    dayDates
  } = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    
    // Initialize counts for next 7 days
    const dailyCounts: number[] = Array(7).fill(0)
    const labels: string[] = []
    const dayDates: Date[] = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(todayStart)
      date.setDate(date.getDate() + i)
      labels.push(formatDateLabel(date))
      dayDates.push(date)
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
      labels,
      dayDates
    }
  }, [assignments])

  // Hourly data for selected day
  const hourlyData = useMemo(() => {
    if (selectedDay === null) return null
    const counts = getHourlyData(selectedDay)
    
    // Filter to only hours with reviews
    const hoursWithReviews: { hour: number; count: number }[] = []
    counts.forEach((count, hour) => {
      if (count > 0) {
        hoursWithReviews.push({ hour, count })
      }
    })
    
    return hoursWithReviews
  }, [selectedDay, assignments])

  // Format hour as "9 AM", "2 PM", etc.
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  const handleBarClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const dayIndex = elements[0].index
      setSelectedDay(dayIndex)
    }
  }

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

  // Hourly chart data
  const hourlyChartData = hourlyData ? {
    labels: hourlyData.map(h => formatHour(h.hour)),
    datasets: [
      {
        label: t('forecast.reviews'),
        data: hourlyData.map(h => h.count),
        backgroundColor: hourlyData.map(h => getBarColor(h.count)),
        borderColor: hourlyData.map(h => getBorderColor(h.count)),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  } : null

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleBarClick,
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
          },
          footer: () => selectedDay === null ? t('forecast.clickToExpand') : ''
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

  const hourlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y} ${t('forecast.reviews')}`
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
          {selectedDay !== null ? (
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center gap-2 text-wanikani-cyan hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{t('forecast.backToWeek')}</span>
            </button>
          ) : null}
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {selectedDay !== null 
              ? `${t('forecast.hourlyBreakdown')} - ${labels[selectedDay]}`
              : t('forecast.title')
            }
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {selectedDay !== null
              ? t('forecast.hourlySubtitle')
              : t('forecast.subtitle')
            }
          </p>
        </div>
        {selectedDay === null && (
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
        )}
      </div>

      <div className="h-64 mb-4">
        {selectedDay !== null && hourlyChartData ? (
          hourlyData && hourlyData.length > 0 ? (
            <Bar data={hourlyChartData} options={hourlyOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-wanikani-text-light dark:text-wanikani-text-light-dark">
              {t('forecast.noReviewsThisDay')}
            </div>
          )
        ) : (
          <Bar ref={chartRef} data={data} options={options} />
        )}
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
