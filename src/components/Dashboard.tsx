'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LogOut } from 'lucide-react'
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
import SimilarKanjiWarnings from './SimilarKanjiWarnings'
import LessonBatchingHelper from './LessonBatchingHelper'
import SrsStageHistogram from './SrsStageHistogram'
import StreakAnalysis from './StreakAnalysis'
import CriticalItems from './CriticalItems'
import LanguageToggle from './LanguageToggle'
import ThemeToggle from './ThemeToggle'
import ExportData from './ExportData'
import ReviewForecast from './ReviewForecast'
import ComponentDependencyTree from './ComponentDependencyTree'
import BurnedItemsGallery from './BurnedItemsGallery'
import ReadingVsMeaningAnalysis from './ReadingVsMeaningAnalysis'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { activeTab, setActiveTab } = useTabState<'projection' | 'burn' | 'heatmap' | 'forecast' | 'dependencies' | 'burned'>('projection')

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
    // Stale-while-revalidate: Try to show cached data immediately
    if (!forceRefresh) {
      const staleUser = wanikaniService.getStaleCache<{ data: UserData }>('/user')
      if (staleUser?.data) {
        // We have stale data - show it immediately while we refresh in background
        setUserData(staleUser.data)
        setLoading(false)
      }
    }
    
    if (forceRefresh || !userData) {
      setLoading(true)
    }
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

  const { t } = useLanguage()

  const handleLogout = () => {
    onTokenChange('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-wanikani-bg dark:bg-wanikani-bg-dark flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-wanikani-pink flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🦀</span>
          </div>
          <p className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-wanikani-bg dark:bg-wanikani-bg-dark flex items-center justify-center p-4 transition-colors">
        <div className="wk-card rounded-lg p-6 max-w-md text-center">
          <div className="text-4xl mb-4">😿</div>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => onTokenChange('')}
            className="bg-wanikani-pink hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('error.updateToken')}
          </button>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-wanikani-bg dark:bg-wanikani-bg-dark transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-wanikani-card-dark border-b border-wanikani-border dark:border-wanikani-border-dark px-6 py-3 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦀</span>
              <span className="text-xl font-bold text-wanikani-pink">{t('header.title')}</span>
            </div>
            <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
              {t('header.level')} <span className="font-bold text-wanikani-text dark:text-wanikani-text-dark">{userData.level}</span> · {userData.username}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <ExportData
              assignments={assignments}
              reviewStats={reviewStats}
              levelProgressions={levelProgressions}
              subjects={subjects}
              srsSystems={srsSystems}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-700 text-wanikani-text dark:text-wanikani-text-dark rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              {t('header.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Refresh Message Notification */}
      {refreshMessage && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-600 text-sm">✓ {refreshMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <SubscriptionInfo userData={userData} />
        <StatsOverview userData={userData} reviewStats={reviewStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LevelPacingCoach
            assignments={assignments}
            subjects={subjects}
            levelProgressions={levelProgressions}
            srsSystems={srsSystems}
            userData={userData}
          />
          <LessonBatchingHelper summary={summary} />
        </div>

        <div className="wk-card rounded-lg overflow-hidden">
          <div className="flex gap-1 p-3 bg-gray-50 border-b border-wanikani-border">
            <TabButton
              label={t('tabs.levelProjection')}
              isActive={activeTab === 'projection'}
              onClick={() => setActiveTab('projection')}
            />
            <TabButton
              label={t('tabs.burnProjection')}
              isActive={activeTab === 'burn'}
              onClick={() => setActiveTab('burn')}
            />
            <TabButton
              label={t('tabs.studyHeatmap')}
              isActive={activeTab === 'heatmap'}
              onClick={() => setActiveTab('heatmap')}
            />
            <TabButton
              label={t('tabs.reviewForecast')}
              isActive={activeTab === 'forecast'}
              onClick={() => setActiveTab('forecast')}
            />
            <TabButton
              label={t('tabs.dependencyTree')}
              isActive={activeTab === 'dependencies'}
              onClick={() => setActiveTab('dependencies')}
            />
            <TabButton
              label={t('tabs.burnGallery')}
              isActive={activeTab === 'burned'}
              onClick={() => setActiveTab('burned')}
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
            ) : activeTab === 'heatmap' ? (
              <StudyHeatmap
                assignments={assignments}
                userData={userData}
              />
            ) : activeTab === 'forecast' ? (
              <ReviewForecast
                assignments={assignments}
                summary={summary}
              />
            ) : activeTab === 'dependencies' ? (
              <ComponentDependencyTree
                subjects={subjects}
                assignments={assignments}
              />
            ) : (
              <BurnedItemsGallery
                subjects={subjects}
                assignments={assignments}
              />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BurnRadar assignments={assignments} subjects={subjects} srsSystems={srsSystems} />
          <LeechDetector reviewStats={reviewStats} subjects={subjects} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimilarKanjiWarnings subjects={subjects} reviewStats={reviewStats} />
          <StreakAnalysis reviewStats={reviewStats} subjects={subjects} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CriticalItems assignments={assignments} subjects={subjects} srsSystems={srsSystems} />
          <ReadingVsMeaningAnalysis reviewStats={reviewStats} subjects={subjects} />
        </div>

        <SrsStageHistogram assignments={assignments} subjects={subjects} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LevelProgress userData={userData} subjects={subjects} assignments={assignments} />
          <AccuracyChart reviewStats={reviewStats} subjects={subjects} />
        </div>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-wanikani-border">
          <p className="text-wanikani-text-light text-sm">{t('footer.message')} 🦀</p>
        </footer>
      </main>
    </div>
  )
}
