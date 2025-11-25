'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UserData, Subject, Assignment } from '@/types/wanikani'

interface LevelProgressProps {
  userData: UserData
  subjects: Subject[]
  assignments: Assignment[]
}

export default function LevelProgress({ userData, subjects, assignments }: LevelProgressProps) {
  const [selectedLevel, setSelectedLevel] = useState(userData.level)

  useEffect(() => {
    setSelectedLevel(userData.level)
  }, [userData.level])

  const levelOptions = useMemo(
    () => Array.from({ length: userData.level }, (_, i) => i + 1),
    [userData.level]
  )

  const selectedLevelSubjects = useMemo(
    () => subjects.filter(s => s.data.level === selectedLevel && !s.data.hidden_at),
    [subjects, selectedLevel]
  )
  
  // Get assignments for the selected level subjects
  const selectedLevelSubjectIds = useMemo(
    () => new Set(selectedLevelSubjects.map(s => s.id)),
    [selectedLevelSubjects]
  )

  const selectedLevelAssignments = useMemo(
    () => assignments.filter(a => selectedLevelSubjectIds.has(a.data.subject_id) && !a.data.hidden),
    [assignments, selectedLevelSubjectIds]
  )
  
  // Create assignment lookup for easy access
  const assignmentLookup = useMemo(
    () => new Map(selectedLevelAssignments.map(a => [a.data.subject_id, a])),
    [selectedLevelAssignments]
  )
  
  const radicals = selectedLevelSubjects.filter(s => s.object === 'radical')
  const kanji = selectedLevelSubjects.filter(s => s.object === 'kanji')
  const vocabulary = selectedLevelSubjects.filter(s => s.object === 'vocabulary' || s.object === 'kana_vocabulary')

  // Calculate completed items (SRS stage 5+ means passed/guru+)
  const getCompletedCount = (subjectList: Subject[]) => {
    return subjectList.filter(subject => {
      const assignment = assignmentLookup.get(subject.id)
      return assignment && assignment.data.srs_stage >= 5
    }).length
  }

  const completedRadicals = getCompletedCount(radicals)
  const completedKanji = getCompletedCount(kanji)
  const completedVocabulary = getCompletedCount(vocabulary)

  const ProgressBar = ({ label, current, total, color }: { label: string, current: number, total: number, color: string }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">{label}</span>
          <span className="text-gray-400">{current}/{total}</span>
        </div>
        <div className="w-full bg-wanikani-darker/50 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          {percentage.toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div className="wk-card rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical via-wanikani-kanji to-wanikani-vocabulary"></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="wk-gradient-text">Level {selectedLevel} Progress</span>
            <span className="text-lg opacity-50 japanese-text">進捗</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Guru+ items count as completed</p>
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(parseInt(e.target.value, 10))}
          className="bg-wanikani-darker/50 text-white px-3 py-2 rounded-xl border border-wanikani-kanji/20 focus:outline-none focus:ring-2 focus:ring-wanikani-kanji/50 focus:border-wanikani-kanji/30 transition-all"
        >
          {levelOptions.map(level => (
            <option key={level} value={level}>
              Level {level} {level === userData.level ? '(current)' : ''}
            </option>
          ))}
        </select>
      </div>
      
      {selectedLevelSubjects.length === 0 ? (
        <div className="text-gray-400 text-sm bg-wanikani-darker/30 border border-wanikani-kanji/10 rounded-xl p-4">
          No subject data available for this level yet. Try refreshing or check your subscription limits.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <ProgressBar
              label="Radicals"
              current={completedRadicals}
              total={radicals.length}
              color="bg-wanikani-radical"
            />
            
            <ProgressBar
              label="Kanji"
              current={completedKanji}
              total={kanji.length}
              color="bg-wanikani-kanji"
            />
            
            <ProgressBar
              label="Vocabulary"
              current={completedVocabulary}
              total={vocabulary.length}
              color="bg-wanikani-vocabulary"
            />
          </div>

          <div className="mt-6 p-4 bg-wanikani-darker/30 rounded-xl border border-wanikani-kanji/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="group">
                <div className="text-2xl font-bold text-wanikani-radical group-hover:scale-110 transition-transform">{completedRadicals}/{radicals.length || 0}</div>
                <div className="text-xs text-gray-400 japanese-text">部首</div>
              </div>
              <div className="group">
                <div className="text-2xl font-bold text-wanikani-kanji group-hover:scale-110 transition-transform">{completedKanji}/{kanji.length || 0}</div>
                <div className="text-xs text-gray-400 japanese-text">漢字</div>
              </div>
              <div className="group">
                <div className="text-2xl font-bold text-wanikani-vocabulary group-hover:scale-110 transition-transform">{completedVocabulary}/{vocabulary.length || 0}</div>
                <div className="text-xs text-gray-400 japanese-text">単語</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
