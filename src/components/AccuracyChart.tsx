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
    <div className="wk-card rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical via-wanikani-kanji to-wanikani-vocabulary"></div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="wk-gradient-text">Accuracy by Type</span>
        <span className="text-lg opacity-50 japanese-text">正確率</span>
      </h2>
      
      <div className="h-64 flex items-center justify-center">
        <Doughnut data={data} options={options} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 rounded-xl bg-wanikani-darker/30 hover:bg-wanikani-darker/50 transition-all group">
          <div className="text-2xl font-bold text-wanikani-radical group-hover:scale-110 transition-transform">
            {radicalAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400 japanese-text">部首</div>
        </div>
        <div className="p-3 rounded-xl bg-wanikani-darker/30 hover:bg-wanikani-darker/50 transition-all group">
          <div className="text-2xl font-bold text-wanikani-kanji group-hover:scale-110 transition-transform">
            {kanjiAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400 japanese-text">漢字</div>
        </div>
        <div className="p-3 rounded-xl bg-wanikani-darker/30 hover:bg-wanikani-darker/50 transition-all group">
          <div className="text-2xl font-bold text-wanikani-vocabulary group-hover:scale-110 transition-transform">
            {combinedVocabularyAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400 japanese-text">単語</div>
        </div>
      </div>
    </div>
  )
}
