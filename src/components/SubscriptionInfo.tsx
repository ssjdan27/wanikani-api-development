'use client'

import { UserData } from '@/types/wanikani'
import { Shield, Crown, Clock, AlertTriangle } from 'lucide-react'

interface SubscriptionInfoProps {
  userData: UserData
}

export default function SubscriptionInfo({ userData }: SubscriptionInfoProps) {
  const subscription = userData.subscription
  
  if (!subscription) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-medium">Subscription Status Unknown</span>
        </div>
        <p className="text-gray-300 text-sm mt-2">
          Unable to determine subscription status. Some features may be limited.
        </p>
      </div>
    )
  }

  const getSubscriptionIcon = () => {
    switch (subscription.type) {
      case 'lifetime':
        return <Crown className="w-5 h-5 text-yellow-400" />
      case 'recurring':
        return <Shield className="w-5 h-5 text-blue-400" />
      case 'free':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-red-400" />
    }
  }

  const getStatusColor = () => {
    if (!subscription.active) return 'red'
    if (subscription.type === 'lifetime') return 'yellow'
    if (subscription.type === 'recurring') return 'blue'
    return 'gray'
  }

  const getStatusText = () => {
    if (!subscription.active) return 'Inactive'
    if (subscription.type === 'lifetime') return 'Lifetime'
    if (subscription.type === 'recurring') return 'Active'
    if (subscription.type === 'free') return 'Free'
    return 'Unknown'
  }

  const statusColor = getStatusColor()
  const maxLevel = subscription.max_level_granted

  return (
    <div className={`bg-${statusColor}-900/20 border border-${statusColor}-500 rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getSubscriptionIcon()}
          <span className={`text-${statusColor}-400 font-medium`}>
            {getStatusText()} Subscription
          </span>
        </div>
        <div className="text-right">
          <div className={`text-${statusColor}-400 text-sm`}>
            Access Level: {maxLevel === 60 ? 'Full' : `Levels 1-${maxLevel}`}
          </div>
          {subscription.period_ends_at && (
            <div className="text-gray-400 text-xs">
              {subscription.type === 'recurring' ? 'Renews' : 'Ends'}: {' '}
              {new Date(subscription.period_ends_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {maxLevel < 60 && (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-gray-300 text-sm">
            <strong>Note:</strong> Your subscription grants access to levels 1-{maxLevel}. 
            Content above level {maxLevel} is filtered from the dashboard to respect your subscription limits.
          </p>
        </div>
      )}
      
      {!subscription.active && (
        <div className="mt-3 p-3 bg-red-800/30 rounded-lg">
          <p className="text-red-300 text-sm">
            <strong>Subscription Inactive:</strong> Your subscription is not currently active. 
            Some features may be limited and content access is restricted to free levels.
          </p>
        </div>
      )}
    </div>
  )
}
