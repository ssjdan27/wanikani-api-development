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
      <div className="wk-card rounded-lg p-4 mb-6 border-l-4 border-yellow-500">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-700 font-medium">Subscription Status Unknown</span>
        </div>
        <p className="text-wanikani-text-light text-sm mt-2">
          Unable to determine subscription status. Some features may be limited.
        </p>
      </div>
    )
  }

  const getSubscriptionIcon = () => {
    switch (subscription.type) {
      case 'lifetime':
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 'recurring':
        return <Shield className="w-5 h-5 text-wanikani-cyan" />
      case 'free':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getBorderColor = () => {
    if (!subscription.active) return 'border-red-400'
    if (subscription.type === 'lifetime') return 'border-yellow-400'
    if (subscription.type === 'recurring') return 'border-wanikani-cyan'
    return 'border-gray-300'
  }

  const getStatusText = () => {
    if (!subscription.active) return 'Inactive'
    if (subscription.type === 'lifetime') return 'Lifetime Member'
    if (subscription.type === 'recurring') return 'Active Subscription'
    if (subscription.type === 'free') return 'Free Account'
    return 'Unknown'
  }

  const maxLevel = subscription.max_level_granted

  return (
    <div className={`wk-card rounded-lg p-4 mb-6 border-l-4 ${getBorderColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getSubscriptionIcon()}
          <span className="font-medium text-wanikani-text">
            {getStatusText()}
          </span>
          {subscription.type === 'lifetime' && (
            <span className="text-yellow-500 text-sm">✨</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-wanikani-text text-sm">
            Access: {maxLevel === 60 ? (
              <span className="text-wanikani-cyan font-medium">Full Access (All 60 Levels)</span>
            ) : (
              <span>Levels 1-{maxLevel}</span>
            )}
          </div>
          {subscription.period_ends_at && (
            <div className="text-wanikani-text-light text-xs">
              {subscription.type === 'recurring' ? 'Renews' : 'Ends'}: {' '}
              {new Date(subscription.period_ends_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {maxLevel < 60 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-wanikani-border">
          <p className="text-wanikani-text-light text-sm">
            <strong className="text-wanikani-text">Note:</strong> Content above level {maxLevel} is filtered to respect subscription limits.
          </p>
        </div>
      )}
      
      {!subscription.active && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 text-sm">
            <strong>Notice:</strong> Subscription inactive. Some features are limited.
          </p>
        </div>
      )}
    </div>
  )
}
