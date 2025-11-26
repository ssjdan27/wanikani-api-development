'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UserData, Subject, Assignment } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface LevelProgressProps {
  userData: UserData
  subjects: Subject[]
  assignments: Assignment[]
}

export default function LevelProgress({ userData, subjects, assignments }: LevelProgressProps) {
  const { t } = useLanguage()
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
          <span className="text-wanikani-text dark:text-wanikani-text-dark">{label}</span>
          <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{current}/{total}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark mt-1">
          {percentage.toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('levelProgress.title').replace('{level}', String(selectedLevel))}
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mt-1">{t('levelProgress.guruNote')}</p>
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(parseInt(e.target.value, 10))}
          className="bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark px-3 py-2 rounded-lg border border-wanikani-border dark:border-wanikani-border-dark focus:outline-none focus:ring-2 focus:ring-wanikani-pink/50 focus:border-wanikani-pink transition-all"
        >
          {levelOptions.map(level => (
            <option key={level} value={level}>
              {t('levelProgress.levelOption').replace('{level}', String(level))} {level === userData.level ? t('levelProgress.current') : ''}
            </option>
          ))}
        </select>
      </div>
      
      {selectedLevelSubjects.length === 0 ? (
        <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-sm bg-gray-50 dark:bg-gray-800 border border-wanikani-border dark:border-wanikani-border-dark rounded-lg p-4">
          {t('levelProgress.noData')}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <ProgressBar
              label={t('common.radicals')}
              current={completedRadicals}
              total={radicals.length}
              color="bg-wanikani-radical"
            />
            
            <ProgressBar
              label={t('common.kanji')}
              current={completedKanji}
              total={kanji.length}
              color="bg-wanikani-kanji"
            />
            
            <ProgressBar
              label={t('common.vocabulary')}
              current={completedVocabulary}
              total={vocabulary.length}
              color="bg-wanikani-vocabulary"
            />
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-wanikani-border dark:border-wanikani-border-dark">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-wanikani-radical">{completedRadicals}/{radicals.length || 0}</div>
                <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('common.radicals')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-wanikani-kanji">{completedKanji}/{kanji.length || 0}</div>
                <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('common.kanji')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-wanikani-vocabulary">{completedVocabulary}/{vocabulary.length || 0}</div>
                <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('common.vocabulary')}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
