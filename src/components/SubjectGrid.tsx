'use client'

import { useState } from 'react'
import type { Subject, ReviewStatistic } from '@/types/wanikani'

interface SubjectGridProps {
  subjects: Subject[]
  reviewStats: ReviewStatistic[]
}

export default function SubjectGrid({ subjects, reviewStats }: SubjectGridProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')

  // Create a map of subject IDs to review statistics
  const reviewStatsMap = new Map(
    reviewStats.map(stat => [stat.data.subject_id, stat])
  )

  // Filter subjects based on selected level and type
  let filteredSubjects = subjects.filter(subject => !subject.data.hidden_at)
  
  if (selectedLevel !== null) {
    filteredSubjects = filteredSubjects.filter(subject => subject.data.level === selectedLevel)
  }
  
  if (selectedType !== 'all') {
    filteredSubjects = filteredSubjects.filter(subject => subject.object === selectedType)
  }

  // Sort subjects by level and then by creation date
  filteredSubjects.sort((a, b) => {
    if (a.data.level !== b.data.level) {
      return a.data.level - b.data.level
    }
    return new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime()
  })

  const getSubjectColor = (type: string) => {
    switch (type) {
      case 'radical': return 'bg-wanikani-radical'
      case 'kanji': return 'bg-wanikani-kanji'
      case 'vocabulary': 
      case 'kana_vocabulary': return 'bg-wanikani-vocabulary'
      default: return 'bg-gray-500'
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'border-green-400'
    if (accuracy >= 80) return 'border-yellow-400'
    if (accuracy >= 70) return 'border-orange-400'
    return 'border-red-400'
  }

  const getSubjectAccuracy = (subjectId: number) => {
    const stat = reviewStatsMap.get(subjectId)
    if (!stat) return null
    
    const correct = stat.data.meaning_correct + stat.data.reading_correct
    const incorrect = stat.data.meaning_incorrect + stat.data.reading_incorrect
    const total = correct + incorrect
    
    return total > 0 ? (correct / total * 100) : null
  }

  // Group subjects by level for level selector
  const levels = Array.from(new Set(subjects.map(s => s.data.level))).sort((a, b) => a - b)

  return (
    <div className="bg-wanikani-darker rounded-xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Subject Progress</h2>
        
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="radical">Radicals</option>
            <option value="kanji">Kanji</option>
            <option value="vocabulary">Vocabulary</option>
          </select>

          {/* Level Filter */}
          <select
            value={selectedLevel || ''}
            onChange={(e) => setSelectedLevel(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            {levels.map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No subjects found for the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 xl:grid-cols-20 gap-2">
          {filteredSubjects.slice(0, 200).map((subject) => {
            const accuracy = getSubjectAccuracy(subject.id)
            const hasStats = accuracy !== null
            
            return (
              <div
                key={subject.id}
                className={`
                  relative aspect-square rounded-lg flex items-center justify-center text-white font-bold text-lg
                  ${getSubjectColor(subject.object)}
                  ${hasStats ? `border-2 ${getAccuracyColor(accuracy)}` : 'border border-gray-600'}
                  hover:scale-110 transition-transform duration-200 cursor-pointer
                  japanese-text
                `}
                title={`${subject.data.meanings[0]?.meaning || 'Unknown'} - Level ${subject.data.level}${hasStats ? ` - ${accuracy.toFixed(0)}% accuracy` : ''}`}
              >
                {subject.data.characters || subject.data.meanings[0]?.meaning?.slice(0, 2) || '?'}
                {hasStats && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-800 rounded-full text-xs flex items-center justify-center">
                    {accuracy >= 90 ? '✓' : accuracy >= 70 ? '~' : '!'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      
      {filteredSubjects.length > 200 && (
        <div className="mt-4 text-center text-gray-400">
          Showing first 200 items. Use filters to narrow down results.
        </div>
      )}
    </div>
  )
}
