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
        backgroundColor: 'rgba(0,170,255,0.7)',
        borderColor: '#00aaff',
        borderWidth: 1
      },
      {
        label: 'Kanji',
        data: kanjiCounts,
        backgroundColor: 'rgba(255,0,170,0.7)',
        borderColor: '#ff00aa',
        borderWidth: 1
      },
      {
        label: 'Vocabulary',
        data: vocabCounts,
        backgroundColor: 'rgba(170,0,255,0.7)',
        borderColor: '#aa00ff',
        borderWidth: 1
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
        stacked: true,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255,0,170,0.05)' }
      },
      y: {
        stacked: true,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(255,0,170,0.05)' },
        beginAtZero: true
      }
    }
  }

  return (
    <div className="wk-card rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-apprentice via-wanikani-guru via-wanikani-master via-wanikani-enlightened to-wanikani-burned"></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="wk-gradient-text">SRS Stage Histogram</span>
            <span className="text-lg opacity-50 japanese-text">分布</span>
          </h2>
          <p className="text-sm text-gray-500">Distribution across SRS stages</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-wanikani-radical/20 text-wanikani-radical">部首</span>
          <span className="px-2 py-1 rounded-full bg-wanikani-kanji/20 text-wanikani-kanji">漢字</span>
          <span className="px-2 py-1 rounded-full bg-wanikani-vocabulary/20 text-wanikani-vocabulary">単語</span>
        </div>
      </div>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
