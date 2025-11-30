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
import type { Assignment, Subject, SpacedRepetitionSystem } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface BurnRadarProps {
  assignments: Assignment[]
  subjects: Subject[]
  srsSystems: SpacedRepetitionSystem[]
}

type BurnCandidate = {
  subjectId: number
  label: string
  etaMs: number
  link?: string
}

function intervalToMs(interval: number | null, unit: SpacedRepetitionSystem['data']['stages'][number]['interval_unit']) {
  if (!interval || !unit) return 0
  switch (unit) {
    case 'milliseconds': return interval
    case 'seconds': return interval * 1000
    case 'minutes': return interval * 60 * 1000
    case 'hours': return interval * 60 * 60 * 1000
    case 'days': return interval * 24 * 60 * 60 * 1000
    case 'weeks': return interval * 7 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

function timeToBurn(assignment: Assignment, targetStage: number, stages: SpacedRepetitionSystem['data']['stages']) {
  const now = Date.now()
  const currentStage = assignment.data.srs_stage || 0
  if (currentStage >= targetStage) return 0
  const availableAt = assignment.data.available_at ? new Date(assignment.data.available_at).getTime() : now
  let remaining = Math.max(0, availableAt - now)
  for (let pos = currentStage + 1; pos < targetStage; pos++) {
    const stageInfo = stages.find(s => s.position === pos)
    remaining += intervalToMs(stageInfo?.interval ?? null, stageInfo?.interval_unit ?? null)
  }
  return remaining
}

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1) // back to Monday
  return d.toISOString().split('T')[0]
}

export default function BurnRadar({ assignments, subjects, srsSystems }: BurnRadarProps) {
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const {
    upcoming,
    totalBurned,
    weeklyLabels,
    weeklyCounts
  } = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const srsById = new Map(srsSystems.map(s => [s.id, s]))

    const upcoming: BurnCandidate[] = []
    const burnedByWeek = new Map<string, number>()

    assignments.forEach(a => {
      if (a.data.hidden) return
      const subject = subjectById.get(a.data.subject_id)
      const srs = subject?.data.spaced_repetition_system_id ? srsById.get(subject.data.spaced_repetition_system_id) : undefined
      const burningStage = srs?.data.burning_stage_position ?? 9

      if (a.data.burned_at) {
        const wk = weekKey(new Date(a.data.burned_at))
        burnedByWeek.set(wk, (burnedByWeek.get(wk) || 0) + 1)
        return
      }

      // Skip items where we don't have subject data loaded yet
      // This prevents showing "Item 3243" placeholders
      if (!subject) return

      const etaMs = timeToBurn(a, burningStage, srs?.data.stages || [])
      if (etaMs === 0) return
      
      // Use characters if available, otherwise slug (required for radicals with images)
      const label = subject.data.characters || subject.data.slug
      if (!label) return // Skip if we still don't have a valid label
      
      upcoming.push({
        subjectId: a.data.subject_id,
        label,
        etaMs,
        link: subject.data.document_url
      })
    })

    const sortedWeeks = Array.from(burnedByWeek.keys()).sort()
    const recentWeeks = sortedWeeks.slice(-8)
    const weeklyLabels = recentWeeks
    const weeklyCounts = recentWeeks.map(week => burnedByWeek.get(week) || 0)

    return {
      upcoming: upcoming.sort((a, b) => a.etaMs - b.etaMs).slice(0, 8),
      totalBurned: assignments.filter(a => !!a.data.burned_at).length,
      weeklyLabels,
      weeklyCounts
    }
  }, [assignments, subjects, srsSystems])

  const data = {
    labels: weeklyLabels,
    datasets: [
      {
        label: t('burn.burnsPerWeek'),
        data: weeklyCounts,
        backgroundColor: 'rgba(67, 67, 67, 0.7)',
        borderColor: '#434343',
        borderWidth: 1,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: isDark ? '#e0e0e0' : '#333333' } },
      tooltip: { enabled: true }
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
    <div className="wk-card rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('burn.title')} 🔥
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('burn.subtitle')}</p>
        </div>
        <div className="bg-gray-700 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-gray-300 text-xs">{t('burn.totalBurned')}</div>
          <div className="text-white font-bold text-lg">{totalBurned.toLocaleString()} 🔥</div>
        </div>
      </div>

      <div className="h-48">
        <Bar data={data} options={options} />
      </div>

      <div>
        <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mb-2">{t('burn.nextBurns')}</div>
        {upcoming.length === 0 ? (
          <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{t('burn.noItems')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcoming.map(item => (
              item.link ? (
                <a
                  key={item.subjectId}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark hover:border-gray-400 dark:hover:border-gray-500 hover:ring-2 hover:ring-wanikani-cyan/50 transition-all"
                >
                  <div className="text-2xl font-bold text-wanikani-text dark:text-wanikani-text-dark">{item.label}</div>
                  <div className="text-sm text-wanikani-cyan font-medium">
                    {item.etaMs < 3600000 ? `${(item.etaMs / (1000 * 60)).toFixed(0)}m` : `${(item.etaMs / (1000 * 60 * 60)).toFixed(1)}h`}
                  </div>
                </a>
              ) : (
                <div key={item.subjectId} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-wanikani-border dark:border-wanikani-border-dark hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <div className="text-2xl font-bold text-wanikani-text dark:text-wanikani-text-dark">{item.label}</div>
                  <div className="text-sm text-wanikani-cyan font-medium">
                    {item.etaMs < 3600000 ? `${(item.etaMs / (1000 * 60)).toFixed(0)}m` : `${(item.etaMs / (1000 * 60 * 60)).toFixed(1)}h`}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
