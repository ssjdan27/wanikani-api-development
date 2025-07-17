'use client'

import { useState, useEffect } from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import StatsOverview from './StatsOverview'
import LevelProgress from './LevelProgress'
import SubjectGrid from './SubjectGrid'
import AccuracyChart from './AccuracyChart'
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

  const wanikaniService = new WaniKaniService(apiToken)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [userResponse, reviewStatsResponse, subjectsResponse, assignmentsResponse] = await Promise.all([
        wanikaniService.getUser(),
        wanikaniService.getReviewStatistics(),
        wanikaniService.getSubjects(),
        wanikaniService.getAssignments()
      ])

      setUserData(userResponse)
      setReviewStats(reviewStatsResponse)
      setSubjects(subjectsResponse)
      setAssignments(assignmentsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [apiToken])

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
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
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

      {/* Main Content */}
      <main className="px-6 py-8 space-y-8">
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
