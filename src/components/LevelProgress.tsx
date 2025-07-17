'use client'

import type { UserData, Subject } from '@/types/wanikani'

interface LevelProgressProps {
  userData: UserData
  subjects: Subject[]
}

export default function LevelProgress({ userData, subjects }: LevelProgressProps) {
  const currentLevel = userData.level
  const currentLevelSubjects = subjects.filter(s => s.data.level === currentLevel && !s.data.hidden_at)
  
  const radicals = currentLevelSubjects.filter(s => s.object === 'radical')
  const kanji = currentLevelSubjects.filter(s => s.object === 'kanji')
  const vocabulary = currentLevelSubjects.filter(s => s.object === 'vocabulary' || s.object === 'kana_vocabulary')

  const ProgressBar = ({ label, current, total, color }: { label: string, current: number, total: number, color: string }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">{label}</span>
          <span className="text-gray-400">{current}/{total}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-400 mt-1">
          {percentage.toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div className="bg-wanikani-darker rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Level {currentLevel} Progress</h2>
      
      <div className="space-y-6">
        <ProgressBar
          label="Radicals"
          current={radicals.length}
          total={radicals.length}
          color="bg-wanikani-radical"
        />
        
        <ProgressBar
          label="Kanji"
          current={kanji.length}
          total={kanji.length}
          color="bg-wanikani-kanji"
        />
        
        <ProgressBar
          label="Vocabulary"
          current={vocabulary.length}
          total={vocabulary.length}
          color="bg-wanikani-vocabulary"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-wanikani-radical">{radicals.length}</div>
            <div className="text-xs text-gray-400">部首</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-wanikani-kanji">{kanji.length}</div>
            <div className="text-xs text-gray-400">漢字</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-wanikani-vocabulary">{vocabulary.length}</div>
            <div className="text-xs text-gray-400">単語</div>
          </div>
        </div>
      </div>
    </div>
  )
}
