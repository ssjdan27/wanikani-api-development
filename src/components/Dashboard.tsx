'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import StatsOverview from './StatsOverview'
import LevelProgress from './LevelProgress'
import SubjectGrid from './SubjectGrid'
import AccuracyChart from './AccuracyChart'
import SubscriptionInfo from './SubscriptionInfo'
import { WaniKaniService } from '@/services/wanikani'
import type { UserData, ReviewStatistic, Subject, Assignment } from '@/types/wanikani'

interface DashboardProps {
  apiToken: string
  onTokenChange: (token: string) => void
}

export default function Dashboard({ apiToken, onTokenChange }: DashboardProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStatistic[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshMessage, setRefreshMessage] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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

      // Use incremental updates only if not forcing refresh AND we have existing data
      const hasExistingAssignments = assignments.length > 0
      const hasExistingReviewStats = reviewStats.length > 0
      
      const lastSyncAssignments = (forceRefresh || !hasExistingAssignments) ? null : wanikaniService.getLastSyncTimestamp('assignments')
      const lastSyncReviewStats = (forceRefresh || !hasExistingReviewStats) ? null : wanikaniService.getLastSyncTimestamp('reviewStats')
      
      console.log('Fetch params:', {
        forceRefresh,
        hasExistingAssignments,
        hasExistingReviewStats,
        lastSyncAssignments,
        lastSyncReviewStats
      })
      
      // First, get user data and basic assignments/review stats
      // Skip subjects initially to avoid rate limiting and storage issues
      const [reviewStatsResponse, assignmentsResponse] = await Promise.all([
        wanikaniService.getReviewStatistics(lastSyncReviewStats || undefined),
        wanikaniService.getAssignments(lastSyncAssignments || undefined)
      ])

      console.log('API responses:', {
        reviewStatsCount: reviewStatsResponse.length,
        assignmentsCount: assignmentsResponse.length
      })

      // Only fetch subjects if we don't have them or if forced refresh
      let subjectsResponse: Subject[] = []
      if (forceRefresh || subjects.length === 0) {
        try {
          // Get subjects for the user's current level (essential for progress display)
          const userLevel = userResponse.level
          subjectsResponse = await wanikaniService.getSubjectsWithSubscriptionFilter(
            userResponse, 
            [userLevel] // Only fetch current level to avoid rate limits
          )
          console.log('Subjects loaded for level:', userLevel, 'Count:', subjectsResponse.length)
        } catch (subjectError) {
          console.warn('Failed to load subjects, using empty array:', subjectError)
          subjectsResponse = []
        }
      } else {
        console.log('Using existing subjects:', subjects.length)
        subjectsResponse = subjects
      }

      // For incremental updates, merge with existing data (only if we have existing data)
      if (lastSyncAssignments && !forceRefresh && assignments.length > 0) {
        setAssignments(prev => {
          const updated = [...prev]
          assignmentsResponse.forEach(newAssignment => {
            const existingIndex = updated.findIndex(a => a.id === newAssignment.id)
            if (existingIndex >= 0) {
              updated[existingIndex] = newAssignment
            } else {
              updated.push(newAssignment)
            }
          })
          return updated
        })
      } else {
        setAssignments(assignmentsResponse)
      }

      if (lastSyncReviewStats && !forceRefresh && reviewStats.length > 0) {
        setReviewStats(prev => {
          const updated = [...prev]
          reviewStatsResponse.forEach(newStat => {
            const existingIndex = updated.findIndex(s => s.id === newStat.id)
            if (existingIndex >= 0) {
              updated[existingIndex] = newStat
            } else {
              updated.push(newStat)
            }
          })
          return updated
        })
      } else {
        setReviewStats(reviewStatsResponse)
      }

      setSubjects(subjectsResponse)
      setLastRefresh(new Date())
      
      // Update sync timestamps only if we got data
      const now = new Date().toISOString()
      if (assignmentsResponse.length > 0 || !lastSyncAssignments) {
        wanikaniService.setLastSyncTimestamp('assignments', now)
      }
      if (reviewStatsResponse.length > 0 || !lastSyncReviewStats) {
        wanikaniService.setLastSyncTimestamp('reviewStats', now)
      }
      
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

  // Progressive subjects loading
  const [isLoadingMoreSubjects, setIsLoadingMoreSubjects] = useState(false)
  
  const loadMoreSubjects = useCallback(async () => {
    if (isLoadingMoreSubjects || !userData) return
    
    setIsLoadingMoreSubjects(true)
    try {
      const currentLevel = userData.level
      const maxLevel = userData.subscription?.max_level_granted || 3
      
      // Load subjects for levels 1 through user's current level + 1 (within subscription limits)
      const endLevel = Math.min(currentLevel + 1, maxLevel)
      const levelsToLoad = Array.from({ length: endLevel }, (_, i) => i + 1)
      
      const moreSubjects = await wanikaniService.getSubjectsWithSubscriptionFilter(
        userData,
        levelsToLoad
      )
      
      setSubjects(moreSubjects)
      setRefreshMessage(`Loaded subjects for levels 1-${endLevel}`)
      setTimeout(() => setRefreshMessage(''), 3000)
      
    } catch (error) {
      setError('Failed to load additional subjects: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoadingMoreSubjects(false)
    }
  }, [isLoadingMoreSubjects, userData, wanikaniService])

  // Clear cache and reload (for debugging)
  const handleClearCache = useCallback(() => {
    wanikaniService.clearUserCache()
    setAssignments([])
    setReviewStats([])
    setSubjects([])
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LevelProgress userData={userData} subjects={subjects} assignments={assignments} />
          <AccuracyChart reviewStats={reviewStats} />
        </div>

        <SubjectGrid subjects={subjects} reviewStats={reviewStats} />
      </main>
    </div>
  )
}
