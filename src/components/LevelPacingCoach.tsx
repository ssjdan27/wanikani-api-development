'use client'

import { useMemo } from 'react'
import type { Assignment, LevelProgression, Subject, UserData, SpacedRepetitionSystem } from '@/types/wanikani'

interface LevelPacingCoachProps {
  assignments: Assignment[]
  subjects: Subject[]
  levelProgressions: LevelProgression[]
  srsSystems: SpacedRepetitionSystem[]
  userData: UserData
}

type GatingKanji = {
  subjectId: number
  label: string
  srsStage: number
  passingStage: number
  etaMs: number
}

function intervalToMs(interval: number | null, unit: SpacedRepetitionSystem['data']['stages'][number]['interval_unit']): number {
  if (!interval || !unit) return 0
  switch (unit) {
    case 'milliseconds': return interval
    case 'seconds': return interval * 1000
    case 'minutes': return interval * 60 * 1000
    case 'hours': return interval * 60 * 60 * 1000
    case 'days': return interval * 24 * 60 * 60 * 1000
    case 'weeks': return interval * 7 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

function calculateTimeToStage(
  assignment: Assignment,
  targetStage: number,
  srs: SpacedRepetitionSystem | undefined
): number {
  const stages = srs?.data.stages || []
  const now = Date.now()
  const currentStage = assignment.data.srs_stage || 0

  // If already at/past target, no time needed
  if (currentStage >= targetStage) return 0

  const availableAt = assignment.data.available_at ? new Date(assignment.data.available_at).getTime() : now
  let remaining = Math.max(0, availableAt - now)

  for (let pos = currentStage + 1; pos < targetStage; pos++) {
    const stageInfo = stages.find(s => s.position === pos)
    remaining += intervalToMs(stageInfo?.interval ?? null, stageInfo?.interval_unit ?? null)
  }

  return remaining
}

export default function LevelPacingCoach({
  assignments,
  subjects,
  levelProgressions,
  srsSystems,
  userData
}: LevelPacingCoachProps) {
  const {
    gatingKanji,
    etaDays,
    passingStage,
    currentLevelDurationDays
  } = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const srsById = new Map(srsSystems.map(s => [s.id, s]))

    const kanjiAssignments = assignments.filter(a => a.data.subject_type === 'kanji' && !a.data.hidden)
    const gating: GatingKanji[] = []

    kanjiAssignments.forEach(a => {
      const subject = subjectById.get(a.data.subject_id)
      if (!subject || subject.data.level !== userData.level) return
      const srs = subject.data.spaced_repetition_system_id ? srsById.get(subject.data.spaced_repetition_system_id) : undefined
      const passingStage = srs?.data.passing_stage_position ?? 5
      const etaMs = calculateTimeToStage(a, passingStage, srs)
      if (a.data.srs_stage < passingStage) {
        gating.push({
          subjectId: subject.id,
          label: subject.data.characters || subject.data.slug || `Kanji ${subject.id}`,
          srsStage: a.data.srs_stage,
          passingStage,
          etaMs
        })
      }
    })

    const etaMs = gating.length ? Math.max(...gating.map(g => g.etaMs)) : 0
    const etaDays = etaMs / (1000 * 60 * 60 * 24)

    // Current level duration so far
    const currentLevelStart = levelProgressions.find(lp => lp.data.level === userData.level)?.data.unlocked_at || userData.started_at
    const currentLevelDurationDays = (Date.now() - new Date(currentLevelStart).getTime()) / (1000 * 60 * 60 * 24)

    return {
      gatingKanji: gating.sort((a, b) => a.etaMs - b.etaMs).slice(0, 8),
      etaDays,
      passingStage: gating[0]?.passingStage ?? 5,
      currentLevelDurationDays
    }
  }, [assignments, subjects, srsSystems, userData.level, userData.started_at, levelProgressions])

  return (
    <div className="wk-card rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text">
            Level Pacing Coach
          </h2>
          <p className="text-sm text-wanikani-text-light">Which kanji are blocking level-up</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Gating kanji</div>
            <div className="text-wanikani-kanji font-bold text-lg">{gatingKanji.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">ETA to next level</div>
            <div className="text-wanikani-text font-bold text-lg">
              {gatingKanji.length === 0 ? 'Ready!' : `${etaDays.toFixed(1)} days`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Passing stage</div>
            <div className="text-wanikani-guru font-bold text-lg">SRS {passingStage}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:bg-gray-100 transition-colors">
            <div className="text-wanikani-text-light text-xs">Time in level</div>
            <div className="text-wanikani-text font-bold text-lg">{currentLevelDurationDays.toFixed(1)} days</div>
          </div>
        </div>
      </div>

      {gatingKanji.length === 0 ? (
        <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <span>✓</span>
          All current-level kanji are at or above passing. You can level up as soon as your reviews allow!
        </div>
      ) : (
        <div>
          <div className="text-sm text-wanikani-text-light mb-2">Focus these next:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {gatingKanji.map(item => (
              <div key={item.subjectId} className="bg-gray-50 rounded-lg p-3 border border-wanikani-border hover:border-wanikani-kanji hover:shadow-sm transition-all">
                <div className="text-2xl font-bold text-wanikani-kanji mb-1">{item.label}</div>
                <div className="text-xs text-wanikani-text-light">SRS {item.srsStage} → {item.passingStage}</div>
                <div className="text-sm text-wanikani-cyan mt-1 font-medium">
                  {item.etaMs <= 0 ? 'Ready now!' : `${(item.etaMs / (1000 * 60 * 60)).toFixed(1)}h`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
