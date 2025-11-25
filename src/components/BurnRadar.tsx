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

      const etaMs = timeToBurn(a, burningStage, srs?.data.stages || [])
      if (etaMs === 0) return
      upcoming.push({
        subjectId: a.data.subject_id,
        label: subject?.data.characters || subject?.data.slug || `Item ${a.data.subject_id}`,
        etaMs,
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
        label: 'Burns per week',
        data: weeklyCounts,
        backgroundColor: 'rgba(67, 67, 67, 0.8)',
        borderColor: '#666666',
        borderWidth: 1,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af' } },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255,0,170,0.05)' }
      },
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255,0,170,0.05)' },
        beginAtZero: true
      }
    }
  }

  return (
    <div className="wk-card rounded-2xl p-6 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-burned via-gray-500 to-wanikani-burned"></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="wk-gradient-text">Burn Radar</span>
            <span className="text-lg opacity-50 japanese-text">🔥</span>
          </h2>
          <p className="text-sm text-gray-500">Upcoming burns and burn velocity</p>
        </div>
        <div className="bg-wanikani-burned/20 rounded-xl p-3 border border-wanikani-burned/30">
          <div className="text-gray-400 text-xs">Total burned</div>
          <div className="text-white font-bold text-lg">{totalBurned.toLocaleString()} 🔥</div>
        </div>
      </div>

      <div className="h-48">
        <Bar data={data} options={options} />
      </div>

      <div>
        <div className="text-sm text-gray-400 mb-2">Next burns (fastest to slowest)</div>
        {upcoming.length === 0 ? (
          <div className="text-gray-400 text-sm bg-wanikani-darker/30 rounded-xl p-3">No items approaching burn yet. Keep studying! 頑張って！</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcoming.map(item => (
              <div key={item.subjectId} className="bg-wanikani-darker/50 rounded-xl p-3 border border-wanikani-burned/20 hover:border-wanikani-burned/50 transition-all group">
                <div className="text-2xl font-bold text-white wk-kanji group-hover:scale-110 transition-transform inline-block">{item.label}</div>
                <div className="text-sm text-wanikani-gold">
                  {item.etaMs < 3600000 ? `${(item.etaMs / (1000 * 60)).toFixed(0)}m` : `${(item.etaMs / (1000 * 60 * 60)).toFixed(1)}h`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
