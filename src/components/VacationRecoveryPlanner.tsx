'use client'

import { useState, useMemo } from 'react'
import { differenceInDays, addDays, format } from 'date-fns'
import { Palmtree, Calendar, TrendingUp } from 'lucide-react'
import type { UserData, Assignment } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface VacationRecoveryPlannerProps {
  userData: UserData
  assignments: Assignment[]
}

type PlanMode = 'current' | 'future'

// SRS stage names for breakdown
const SRS_STAGES = [
  { name: 'Apprentice 1', color: 'bg-pink-500' },
  { name: 'Apprentice 2', color: 'bg-pink-500' },
  { name: 'Apprentice 3', color: 'bg-pink-500' },
  { name: 'Apprentice 4', color: 'bg-pink-500' },
  { name: 'Guru 1', color: 'bg-purple-500' },
  { name: 'Guru 2', color: 'bg-purple-500' },
  { name: 'Master', color: 'bg-blue-500' },
  { name: 'Enlightened', color: 'bg-cyan-500' },
]

export default function VacationRecoveryPlanner({ userData, assignments }: VacationRecoveryPlannerProps) {
  const { t } = useLanguage()
  const [planMode, setPlanMode] = useState<PlanMode>('current')
  const [futureDays, setFutureDays] = useState(7)
  const [futureStartDate, setFutureStartDate] = useState(() => {
    const tomorrow = addDays(new Date(), 1)
    return format(tomorrow, 'yyyy-MM-dd')
  })

  const isOnVacation = !!userData.current_vacation_started_at
  const vacationStartDate = userData.current_vacation_started_at 
    ? new Date(userData.current_vacation_started_at) 
    : null

  // Calculate vacation duration
  const vacationDays = vacationStartDate 
    ? differenceInDays(new Date(), vacationStartDate) 
    : 0

  // Calculate current pile-up
  const currentPileUp = useMemo(() => {
    const now = new Date()
    const stageCounts: number[] = Array(8).fill(0)
    let total = 0

    assignments.forEach(a => {
      if (a.data.hidden || a.data.srs_stage === 9 || a.data.srs_stage === 0) return
      if (!a.data.available_at) return
      
      const availableAt = new Date(a.data.available_at)
      if (availableAt <= now) {
        total++
        if (a.data.srs_stage >= 1 && a.data.srs_stage <= 8) {
          stageCounts[a.data.srs_stage - 1]++
        }
      }
    })

    return { total, stageCounts }
  }, [assignments])

  // Calculate future pile-up projection
  const futurePileUp = useMemo(() => {
    const startDate = new Date(futureStartDate)
    const endDate = addDays(startDate, futureDays)
    const stageCounts: number[] = Array(8).fill(0)
    let total = 0

    // Count reviews that would become available during vacation period
    assignments.forEach(a => {
      if (a.data.hidden || a.data.srs_stage === 9 || a.data.srs_stage === 0) return
      if (!a.data.available_at) return
      
      const availableAt = new Date(a.data.available_at)
      // Items available before vacation end
      if (availableAt <= endDate) {
        total++
        if (a.data.srs_stage >= 1 && a.data.srs_stage <= 8) {
          stageCounts[a.data.srs_stage - 1]++
        }
      }
    })

    return { total, stageCounts }
  }, [assignments, futureStartDate, futureDays])

  const activePileUp = planMode === 'current' ? currentPileUp : futurePileUp
  const activeDays = planMode === 'current' ? vacationDays : futureDays

  // Recovery strategies
  const recoveryStrategies = [
    { reviewsPerDay: 50, label: t('vacation.lightPace'), emoji: '🐢' },
    { reviewsPerDay: 100, label: t('vacation.normalPace'), emoji: '🚶' },
    { reviewsPerDay: 150, label: t('vacation.intensePace'), emoji: '🏃' },
    { reviewsPerDay: 200, label: t('vacation.sprintPace'), emoji: '🚀' },
  ]

  // Don't show if not on vacation and in current mode with no pile-up (unless planning future)
  if (planMode === 'current' && !isOnVacation && currentPileUp.total === 0) {
    return (
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Palmtree className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('vacation.title')}
            </h2>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">{t('vacation.notOnVacation')}</p>
        
        <button
          onClick={() => setPlanMode('future')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {t('vacation.planFuture')}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Palmtree className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('vacation.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {planMode === 'current' ? t('vacation.subtitleCurrent') : t('vacation.subtitlePlanning')}
            </p>
          </div>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setPlanMode('current')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              planMode === 'current'
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
            }`}
          >
            {t('vacation.currentTab')}
          </button>
          <button
            onClick={() => setPlanMode('future')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              planMode === 'future'
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
            }`}
          >
            {t('vacation.planTab')}
          </button>
        </div>
      </div>

      {/* Future Vacation Planner Inputs */}
      {planMode === 'future' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('vacation.planYourVacation')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('vacation.startDate')}
              </label>
              <input
                type="date"
                value={futureStartDate}
                onChange={(e) => setFutureStartDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('vacation.duration')}
              </label>
              <select
                value={futureDays}
                onChange={(e) => setFutureDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[3, 5, 7, 10, 14, 21, 30].map(d => (
                  <option key={d} value={d}>{d} {t('common.days')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Current Vacation Status */}
      {planMode === 'current' && isOnVacation && vacationStartDate && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <span className="text-xl">🏖️</span>
            <span className="font-medium">
              {t('vacation.onVacationSince').replace('{date}', format(vacationStartDate, 'MMM d, yyyy'))}
            </span>
          </div>
          <p className="text-yellow-600 dark:text-yellow-500 text-sm mt-1">
            {t('vacation.daysOnVacation').replace('{days}', String(vacationDays))}
          </p>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-red-500">{activePileUp.total}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('vacation.reviewsPiledUp')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-cyan-500">{activeDays}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {planMode === 'current' ? t('vacation.daysAway') : t('vacation.plannedDays')}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold text-purple-500">
            {activeDays > 0 ? Math.round(activePileUp.total / activeDays) : 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('vacation.avgPerDay')}</div>
        </div>
      </div>

      {/* SRS Stage Breakdown */}
      {activePileUp.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('vacation.srsBreakdown')}
          </h3>
          <div className="space-y-2">
            {SRS_STAGES.map((stage, idx) => {
              const count = activePileUp.stageCounts[idx]
              if (count === 0) return null
              const percentage = (count / activePileUp.total) * 100
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400">{stage.name}</div>
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recovery Strategies */}
      {activePileUp.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('vacation.recoveryPlan')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recoveryStrategies.map((strategy) => {
              const daysToRecover = Math.ceil(activePileUp.total / strategy.reviewsPerDay)
              return (
                <div 
                  key={strategy.reviewsPerDay}
                  className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="text-2xl mb-1">{strategy.emoji}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {strategy.reviewsPerDay}/day
                  </div>
                  <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                    {daysToRecover} {daysToRecover === 1 ? t('common.day') : t('common.days')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{strategy.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {activePileUp.total > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>💡 {t('vacation.tip')}</p>
        </div>
      )}
    </div>
  )
}
