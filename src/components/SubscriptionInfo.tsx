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
      <div className="wk-card border-wanikani-kanji/30 rounded-2xl p-4 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-wanikani-kanji"></div>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-wanikani-kanji" />
          <span className="text-wanikani-kanji font-medium">Subscription Status Unknown</span>
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
        return <Crown className="w-5 h-5 text-wanikani-gold" />
      case 'recurring':
        return <Shield className="w-5 h-5 text-wanikani-radical" />
      case 'free':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-wanikani-kanji" />
    }
  }

  const getGradient = () => {
    if (!subscription.active) return 'from-wanikani-kanji to-wanikani-kanji'
    if (subscription.type === 'lifetime') return 'from-wanikani-gold via-wanikani-sakura to-wanikani-gold'
    if (subscription.type === 'recurring') return 'from-wanikani-radical to-wanikani-kanji'
    return 'from-gray-500 to-gray-600'
  }

  const getStatusText = () => {
    if (!subscription.active) return 'Inactive'
    if (subscription.type === 'lifetime') return '生涯会員 Lifetime'
    if (subscription.type === 'recurring') return 'Active'
    if (subscription.type === 'free') return 'Free'
    return 'Unknown'
  }

  const maxLevel = subscription.max_level_granted

  return (
    <div className="wk-card rounded-2xl p-4 mb-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getGradient()}`}></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getSubscriptionIcon()}
          <span className="font-medium text-white">
            {getStatusText()}
          </span>
          {subscription.type === 'lifetime' && (
            <span className="text-wanikani-gold text-sm animate-pulse">✨</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-gray-300 text-sm">
            Access: {maxLevel === 60 ? (
              <span className="text-wanikani-gold">Full Access 全部</span>
            ) : (
              <span>Levels 1-{maxLevel}</span>
            )}
          </div>
          {subscription.period_ends_at && (
            <div className="text-gray-500 text-xs">
              {subscription.type === 'recurring' ? 'Renews' : 'Ends'}: {' '}
              {new Date(subscription.period_ends_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {maxLevel < 60 && (
        <div className="mt-3 p-3 bg-wanikani-darker/30 rounded-xl border border-wanikani-kanji/10">
          <p className="text-gray-400 text-sm">
            <strong className="text-gray-300">Note:</strong> Content above level {maxLevel} is filtered to respect subscription limits.
          </p>
        </div>
      )}
      
      {!subscription.active && (
        <div className="mt-3 p-3 bg-wanikani-kanji/10 rounded-xl border border-wanikani-kanji/20">
          <p className="text-wanikani-sakura text-sm">
            <strong>注意:</strong> Subscription inactive. Some features are limited.
          </p>
        </div>
      )}
    </div>
  )
}
