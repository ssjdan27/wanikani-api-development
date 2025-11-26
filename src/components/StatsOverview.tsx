'use client'

import type { UserData, ReviewStatistic } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface StatsOverviewProps {
  userData: UserData
  reviewStats: ReviewStatistic[]
}

export default function StatsOverview({ userData, reviewStats }: StatsOverviewProps) {
  const { t } = useLanguage()
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
      label: t('stats.currentLevel'),
      value: userData.level.toString(),
      color: 'text-blue-400'
    },
    {
      label: t('stats.totalReviews'),
      value: totalReviews.toLocaleString(),
      color: 'text-green-400'
    },
    {
      label: t('stats.overallAccuracy'),
      value: `${overallAccuracy.toFixed(1)}%`,
      color: 'text-purple-400'
    },
    {
      label: t('stats.radicalAccuracy'),
      value: `${calculateAccuracy(radicalStats).toFixed(1)}%`,
      color: 'text-wanikani-radical'
    },
    {
      label: t('stats.kanjiAccuracy'),
      value: `${calculateAccuracy(kanjiStats).toFixed(1)}%`,
      color: 'text-wanikani-kanji'
    },
    {
      label: t('stats.vocabAccuracy'),
      value: `${calculateAccuracy(vocabularyStats).toFixed(1)}%`,
      color: 'text-wanikani-vocabulary'
    },
    {
      label: t('stats.accountAge'),
      value: `${accountAge} ${t('common.days')}`,
      color: 'text-yellow-400'
    },
    {
      label: t('stats.itemsStudied'),
      value: visibleStats.length.toLocaleString(),
      color: 'text-indigo-400'
    }
  ]

  return (
    <div className="wk-card rounded-lg p-6">
      <h2 className="text-xl font-bold mb-5 text-wanikani-text">
        {t('stats.title')}
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
