'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import StatsOverview from './StatsOverview'
import LevelProgress from './LevelProgress'
import AccuracyChart from './AccuracyChart'
import SubscriptionInfo from './SubscriptionInfo'
import LevelProjectionChart from './LevelProjectionChart'
import BurnProjectionChart from './BurnProjectionChart'
import { WaniKaniService } from '@/services/wanikani'
import type { UserData, ReviewStatistic, Subject, Assignment, LevelProgression, SpacedRepetitionSystem, Summary } from '@/types/wanikani'
import StudyHeatmap from './StudyHeatmap'
import { useTabState, TabButton } from './Tabs'
import LevelPacingCoach from './LevelPacingCoach'
import BurnRadar from './BurnRadar'
import LeechDetector from './LeechDetector'
import LessonBatchingHelper from './LessonBatchingHelper'
import SrsStageHistogram from './SrsStageHistogram'

interface DashboardProps {
  apiToken: string
  onTokenChange: (token: string) => void
}

export default function Dashboard({ apiToken, onTokenChange }: DashboardProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStatistic[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [levelProgressions, setLevelProgressions] = useState<LevelProgression[]>([])
  const [srsSystems, setSrsSystems] = useState<SpacedRepetitionSystem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshMessage, setRefreshMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { activeTab, setActiveTab } = useTabState<'projection' | 'burn' | 'heatmap'>('projection')

  // Memoize the WaniKani service to prevent unnecessary re-creation
  const wanikaniService = useMemo(() => new WaniKaniService(apiToken), [apiToken])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true)
    setError('')
    setRefreshMessage('')
    
    try {
      // Get user data first to check subscription
      const userResponse = await wanikaniService.getUser()
      setUserData(userResponse)

      const [reviewStatsResponse, assignmentsResponse, levelProgressionsResponse, srsResponse, summaryResponse] = await Promise.all([
        wanikaniService.getReviewStatistics(),
        wanikaniService.getAssignments(),
        wanikaniService.getLevelProgressions(),
        wanikaniService.getSpacedRepetitionSystems(),
        wanikaniService.getSummary()
      ])

      let subjectsResponse: Subject[] = []
      try {
        const maxAccessibleLevel = Math.min(
          userResponse.level,
          userResponse.subscription?.max_level_granted || userResponse.level
        )
        const levelsToLoad = Array.from({ length: maxAccessibleLevel }, (_, i) => i + 1)
        subjectsResponse = await wanikaniService.getSubjectsWithSubscriptionFilter(
          userResponse, 
          levelsToLoad
        )
        console.log('Subjects loaded for levels 1-', maxAccessibleLevel, 'Count:', subjectsResponse.length)
      } catch (subjectError) {
        console.warn('Failed to load subjects, using empty array:', subjectError)
        subjectsResponse = []
      }

      setAssignments(assignmentsResponse)
      setReviewStats(reviewStatsResponse)
      setLevelProgressions(levelProgressionsResponse)
      setSrsSystems(srsResponse)
      setSummary(summaryResponse)
      setSubjects(subjectsResponse)
      setLastRefresh(new Date())
      
      if (forceRefresh) {
        setRefreshMessage('Data refreshed successfully!')
        setTimeout(() => setRefreshMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [wanikaniService])

  // Manual refresh with rate limiting
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || loading || !isOnline) return
    
    setIsRefreshing(true)
    try {
      await fetchData(true) // Force refresh
    } finally {
      // Prevent rapid refresh clicks - minimum 2 seconds between refreshes
      setTimeout(() => setIsRefreshing(false), 2000)
    }
  }, [fetchData, isRefreshing, loading, isOnline])

  // Clear cache and reload (for debugging)
  const handleClearCache = useCallback(() => {
    wanikaniService.clearUserCache()
    setAssignments([])
    setReviewStats([])
    setSubjects([])
    setLevelProgressions([])
    setSrsSystems([])
    setSummary(null)
    setUserData(null)
    fetchData(true)
  }, [wanikaniService, fetchData])

  // Load subjects progressively to avoid rate limiting
  const loadAllSubjects = useCallback(async () => {
    if (!userData) return
    
    try {
      console.log('Loading all subjects progressively...')
      const allSubjects = await wanikaniService.getSubjectsWithSubscriptionFilter(userData)
      setSubjects(allSubjects)
      console.log('All subjects loaded:', allSubjects.length)
    } catch (error) {
      console.error('Failed to load all subjects:', error)
    }
  }, [userData, wanikaniService])

  useEffect(() => {
    if (apiToken) {
      fetchData(false) // Initial load - use cache/incremental
    }
  }, [apiToken, fetchData])

  const handleLogout = () => {
    onTokenChange('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Floating kanji background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <span className="absolute top-[20%] left-[20%] text-8xl opacity-5 wk-kanji animate-float">読</span>
          <span className="absolute top-[40%] right-[25%] text-6xl opacity-5 wk-kanji animate-float" style={{ animationDelay: '0.5s' }}>書</span>
          <span className="absolute bottom-[30%] left-[15%] text-7xl opacity-5 wk-kanji animate-float" style={{ animationDelay: '1s' }}>聞</span>
        </div>
        <div className="text-center z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-wanikani-kanji to-wanikani-vocabulary flex items-center justify-center mx-auto mb-4 shadow-kanji animate-pulse">
              <span className="text-3xl">🦀</span>
            </div>
          </div>
          <p className="text-xl text-gray-300 japanese-text">データを読み込み中...</p>
          <p className="text-sm text-gray-500 mt-2">Loading your WaniKani data</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="wk-card border-wanikani-kanji/30 rounded-2xl p-6 max-w-md text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-kanji to-wanikani-vocabulary"></div>
          <div className="text-4xl mb-4">😿</div>
          <p className="text-wanikani-kanji mb-4 japanese-text">{error}</p>
          <button
            onClick={() => onTokenChange('')}
            className="bg-gradient-to-r from-wanikani-kanji to-wanikani-vocabulary hover:opacity-90 text-white px-6 py-2 rounded-xl transition-all wk-btn"
          >
            Update Token
          </button>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="wk-card border-b border-wanikani-kanji/10 px-6 py-4 sticky top-0 z-50">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical via-wanikani-kanji to-wanikani-vocabulary"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wanikani-kanji to-wanikani-vocabulary flex items-center justify-center shadow-kanji">
                <span className="text-xl">🦀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold wk-gradient-text">WaniKani Dashboard</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="px-2 py-0.5 rounded-full bg-wanikani-kanji/20 text-wanikani-kanji text-xs font-semibold">Lv. {userData.level}</span>
                  <span className="japanese-text">{userData.username}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-wanikani-kanji" />
              )}
              <span className={isOnline ? 'text-green-400' : 'text-wanikani-kanji'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {lastRefresh && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-500 text-xs">{lastRefresh.toLocaleTimeString()}</span>
                </>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading || !isOnline}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-wanikani-radical to-wanikani-radical/80 hover:opacity-90 disabled:opacity-50 text-white rounded-xl transition-all wk-btn shadow-radical"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? '更新中...' : 'Refresh'}</span>
            </button>
            {process.env.NODE_ENV === 'development' && (
              <>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-2 bg-wanikani-gold/80 hover:bg-wanikani-gold text-wanikani-darker rounded-xl transition-all text-sm font-medium"
                  title="Clear cache and reload"
                >
                  Clear Cache
                </button>
                <button
                  onClick={loadAllSubjects}
                  disabled={!userData}
                  className="px-3 py-2 bg-wanikani-vocabulary/80 hover:bg-wanikani-vocabulary disabled:opacity-50 text-white rounded-xl transition-all text-sm"
                  title="Load all subjects progressively"
                >
                  Load All
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-wanikani-darker border border-wanikani-kanji/30 hover:bg-wanikani-kanji/10 hover:border-wanikani-kanji/50 text-gray-300 hover:text-white rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Refresh Message Notification */}
      {refreshMessage && (
        <div className="wk-card border-green-500/30 rounded-xl p-3 mx-6 mt-4">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <span>✨</span>
            {refreshMessage}
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-8 space-y-8">
        <SubscriptionInfo userData={userData} />
        <StatsOverview userData={userData} reviewStats={reviewStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LevelPacingCoach
            assignments={assignments}
            subjects={subjects}
            levelProgressions={levelProgressions}
            srsSystems={srsSystems}
            userData={userData}
          />
          <LessonBatchingHelper summary={summary} />
        </div>

        <div className="wk-card rounded-2xl p-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical via-wanikani-kanji to-wanikani-vocabulary"></div>
          <div className="flex gap-2 px-4 pt-4">
            <TabButton
              label="Level Projection"
              isActive={activeTab === 'projection'}
              onClick={() => setActiveTab('projection')}
            />
            <TabButton
              label="Burn Projection"
              isActive={activeTab === 'burn'}
              onClick={() => setActiveTab('burn')}
            />
            <TabButton
              label="Study Heatmap"
              isActive={activeTab === 'heatmap'}
              onClick={() => setActiveTab('heatmap')}
            />
          </div>
          <div className="p-5">
            {activeTab === 'projection' ? (
              <LevelProjectionChart
                userData={userData}
                levelProgressions={levelProgressions}
              />
            ) : activeTab === 'burn' ? (
              <BurnProjectionChart
                assignments={assignments}
                levelProgressions={levelProgressions}
                userData={userData}
                subjects={subjects}
              />
            ) : (
              <StudyHeatmap
                assignments={assignments}
                userData={userData}
              />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BurnRadar assignments={assignments} subjects={subjects} srsSystems={srsSystems} />
          <LeechDetector reviewStats={reviewStats} subjects={subjects} />
        </div>

        <SrsStageHistogram assignments={assignments} subjects={subjects} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LevelProgress userData={userData} subjects={subjects} assignments={assignments} />
          <AccuracyChart reviewStats={reviewStats} />
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-wanikani-kanji/10">
          <p className="text-gray-500 text-sm japanese-text">頑張って！ Keep going! 🦀</p>
          <p className="text-gray-600 text-xs mt-2">Made with 💜 for Japanese learners</p>
        </footer>
      </main>
    </div>
  )
}
