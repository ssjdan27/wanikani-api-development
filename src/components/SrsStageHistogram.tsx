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
import type { Assignment, Subject } from '@/types/wanikani'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface SrsStageHistogramProps {
  assignments: Assignment[]
  subjects: Subject[]
}

const STAGES = Array.from({ length: 10 }, (_, i) => i)

export default function SrsStageHistogram({ assignments, subjects }: SrsStageHistogramProps) {
  const { radicalCounts, kanjiCounts, vocabCounts } = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))

    const countsTemplate = () => Array.from({ length: 10 }, () => 0)
    const radicalCounts = countsTemplate()
    const kanjiCounts = countsTemplate()
    const vocabCounts = countsTemplate()

    assignments.forEach(a => {
      if (a.data.hidden) return
      const subject = subjectById.get(a.data.subject_id)
      const type = subject?.object || a.data.subject_type
      const stage = Math.max(0, Math.min(9, a.data.srs_stage || 0))
      if (type === 'radical') {
        radicalCounts[stage] += 1
      } else if (type === 'kanji') {
        kanjiCounts[stage] += 1
      } else {
        vocabCounts[stage] += 1
      }
    })

    return { radicalCounts, kanjiCounts, vocabCounts }
  }, [assignments, subjects])

  const data = {
    labels: STAGES.map(s => `SRS ${s}`),
    datasets: [
      {
        label: 'Radicals',
        data: radicalCounts,
        backgroundColor: 'rgba(14,165,233,0.6)',
        borderColor: '#0ea5e9',
        borderWidth: 1
      },
      {
        label: 'Kanji',
        data: kanjiCounts,
        backgroundColor: 'rgba(168,85,247,0.6)',
        borderColor: '#a855f7',
        borderWidth: 1
      },
      {
        label: 'Vocabulary',
        data: vocabCounts,
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderColor: '#10b981',
        borderWidth: 1
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#d1d5db' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        stacked: true,
        ticks: { color: '#d1d5db' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        beginAtZero: true
      }
    }
  }

  return (
    <div className="bg-wanikani-darker rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">SRS Stage Histogram</h2>
          <p className="text-sm text-gray-400">See how your radicals, kanji, and vocab are distributed across stages.</p>
        </div>
      </div>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
