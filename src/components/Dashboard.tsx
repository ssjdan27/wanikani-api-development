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
import type { UserData, ReviewStatistic, Subject, Assignment, LevelProgression } from '@/types/wanikani'
import StudyHeatmap from './StudyHeatmap'
import { useTabState, TabButton } from './Tabs'

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

      const [reviewStatsResponse, assignmentsResponse, levelProgressionsResponse] = await Promise.all([
        wanikaniService.getReviewStatistics(),
        wanikaniService.getAssignments(),
        wanikaniService.getLevelProgressions()
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-300">Loading your WaniKani data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => onTokenChange('')}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Update Token
          </button>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-wanikani-dark">
      {/* Header */}
      <header className="bg-wanikani-darker border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">🦀 WaniKani Dashboard</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span>Level {userData.level}</span>
              <span>•</span>
              <span>{userData.username}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {lastRefresh && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Updated: {lastRefresh.toLocaleTimeString()}</span>
                </>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading || !isOnline}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            {process.env.NODE_ENV === 'development' && (
              <>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
                  title="Clear cache and reload"
                >
                  Clear Cache
                </button>
                <button
                  onClick={loadAllSubjects}
                  disabled={!userData}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors text-sm"
                  title="Load all subjects progressively"
                >
                  Load All Subjects
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Refresh Message Notification */}
      {refreshMessage && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 mx-6 mt-4">
          <p className="text-green-400 text-sm">{refreshMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-8 space-y-8">
        <SubscriptionInfo userData={userData} />
        <StatsOverview userData={userData} reviewStats={reviewStats} />

        <div className="bg-wanikani-darker rounded-xl p-1">
          <div className="flex gap-2 px-4 pt-3">
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
          <LevelProgress userData={userData} subjects={subjects} assignments={assignments} />
          <AccuracyChart reviewStats={reviewStats} />
        </div>
      </main>
    </div>
  )
}
