'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import type { ReviewStatistic } from '@/types/wanikani'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface AccuracyChartProps {
  reviewStats: ReviewStatistic[]
}

export default function AccuracyChart({ reviewStats }: AccuracyChartProps) {
  const visibleStats = reviewStats.filter(stat => !stat.data.hidden)

  const calculateTypeAccuracy = (type: string) => {
    const typeStats = visibleStats.filter(s => s.data.subject_type === type)
    const correct = typeStats.reduce((sum, s) => sum + s.data.meaning_correct + s.data.reading_correct, 0)
    const incorrect = typeStats.reduce((sum, s) => sum + s.data.meaning_incorrect + s.data.reading_incorrect, 0)
    const total = correct + incorrect
    return total > 0 ? (correct / total * 100) : 0
  }

  const radicalAccuracy = calculateTypeAccuracy('radical')
  const kanjiAccuracy = calculateTypeAccuracy('kanji')
  const vocabularyAccuracy = calculateTypeAccuracy('vocabulary')
  const kanaVocabularyAccuracy = calculateTypeAccuracy('kana_vocabulary')
  
  // Calculate combined vocabulary accuracy properly
  const combinedVocabularyAccuracy = (() => {
    const vocabStats = visibleStats.filter(s => s.data.subject_type === 'vocabulary')
    const kanaStats = visibleStats.filter(s => s.data.subject_type === 'kana_vocabulary')
    
    const totalCorrect = 
      vocabStats.reduce((sum, s) => sum + s.data.meaning_correct + s.data.reading_correct, 0) +
      kanaStats.reduce((sum, s) => sum + s.data.meaning_correct + s.data.reading_correct, 0)
    
    const totalIncorrect = 
      vocabStats.reduce((sum, s) => sum + s.data.meaning_incorrect + s.data.reading_incorrect, 0) +
      kanaStats.reduce((sum, s) => sum + s.data.meaning_incorrect + s.data.reading_incorrect, 0)
    
    const total = totalCorrect + totalIncorrect
    return total > 0 ? (totalCorrect / total * 100) : 0
  })()

  const data = {
    labels: ['Radicals', 'Kanji', 'Vocabulary'],
    datasets: [
      {
        data: [radicalAccuracy, kanjiAccuracy, combinedVocabularyAccuracy],
        backgroundColor: [
          '#00aaff',
          '#ff00aa',
          '#aa00ff',
        ],
        borderColor: [
          '#0088cc',
          '#cc0088',
          '#8800cc',
        ],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#ffffff',
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed.toFixed(1)}%`
          }
        }
      }
    },
  }

  return (
    <div className="bg-wanikani-darker rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Accuracy by Type</h2>
      
      <div className="h-64 flex items-center justify-center">
        <Doughnut data={data} options={options} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-wanikani-radical">
            {radicalAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Radicals</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-wanikani-kanji">
            {kanjiAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Kanji</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-wanikani-vocabulary">
            {combinedVocabularyAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Vocabulary</div>
        </div>
      </div>
    </div>
  )
}
