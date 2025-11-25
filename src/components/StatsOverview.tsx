'use client'

import type { UserData, ReviewStatistic } from '@/types/wanikani'

interface StatsOverviewProps {
  userData: UserData
  reviewStats: ReviewStatistic[]
}

export default function StatsOverview({ userData, reviewStats }: StatsOverviewProps) {
  const visibleStats = reviewStats.filter(stat => !stat.data.hidden)
  
  const totalCorrect = visibleStats.reduce((total, stat) => {
    return total + stat.data.meaning_correct + stat.data.reading_correct
  }, 0)
  
  const totalIncorrect = visibleStats.reduce((total, stat) => {
    return total + stat.data.meaning_incorrect + stat.data.reading_incorrect
  }, 0)
  
  const totalReviews = totalCorrect + totalIncorrect
  const overallAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews * 100) : 0

  const radicalStats = visibleStats.filter(s => s.data.subject_type === 'radical')
  const kanjiStats = visibleStats.filter(s => s.data.subject_type === 'kanji')
  const vocabularyStats = visibleStats.filter(s => s.data.subject_type === 'vocabulary' || s.data.subject_type === 'kana_vocabulary')

  const calculateAccuracy = (stats: ReviewStatistic[]) => {
    const correct = stats.reduce((sum, s) => sum + s.data.meaning_correct + s.data.reading_correct, 0)
    const incorrect = stats.reduce((sum, s) => sum + s.data.meaning_incorrect + s.data.reading_incorrect, 0)
    const total = correct + incorrect
    return total > 0 ? (correct / total * 100) : 0
  }

  const accountAge = Math.floor((Date.now() - new Date(userData.started_at).getTime()) / (1000 * 60 * 60 * 24))

  const stats = [
    {
      label: 'Current Level',
      value: userData.level.toString(),
      color: 'text-blue-400'
    },
    {
      label: 'Total Reviews',
      value: totalReviews.toLocaleString(),
      color: 'text-green-400'
    },
    {
      label: 'Overall Accuracy',
      value: `${overallAccuracy.toFixed(1)}%`,
      color: 'text-purple-400'
    },
    {
      label: 'Radical Accuracy',
      value: `${calculateAccuracy(radicalStats).toFixed(1)}%`,
      color: 'text-wanikani-radical'
    },
    {
      label: 'Kanji Accuracy',
      value: `${calculateAccuracy(kanjiStats).toFixed(1)}%`,
      color: 'text-wanikani-kanji'
    },
    {
      label: 'Vocabulary Accuracy',
      value: `${calculateAccuracy(vocabularyStats).toFixed(1)}%`,
      color: 'text-wanikani-vocabulary'
    },
    {
      label: 'Account Age',
      value: `${accountAge} days`,
      color: 'text-yellow-400'
    },
    {
      label: 'Items Studied',
      value: visibleStats.length.toLocaleString(),
      color: 'text-indigo-400'
    }
  ]

  return (
    <div className="wk-card rounded-lg p-6">
      <h2 className="text-xl font-bold mb-5 text-wanikani-text">
        Statistics Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-wanikani-text-light">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
