'use client'

import { UserData } from '@/types/wanikani'
import { Shield, Crown, Clock, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SubscriptionInfoProps {
  userData: UserData
}

export default function SubscriptionInfo({ userData }: SubscriptionInfoProps) {
  const { t } = useLanguage()
  const subscription = userData.subscription
  
  if (!subscription) {
    return (
      <div className="wk-card rounded-lg p-4 mb-6 border-l-4 border-yellow-500">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-700 font-medium">{t('subscription.statusUnknown')}</span>
        </div>
        <p className="text-wanikani-text-light text-sm mt-2">
          {t('subscription.unableToDetermine')}
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
    if (!subscription.active) return t('subscription.inactive')
    if (subscription.type === 'lifetime') return t('subscription.lifetime')
    if (subscription.type === 'recurring') return t('subscription.active')
    if (subscription.type === 'free') return t('subscription.free')
    return t('subscription.unknown')
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
            {t('subscription.access')}: {maxLevel === 60 ? (
              <span className="text-wanikani-cyan font-medium">{t('subscription.fullAccess')}</span>
            ) : (
              <span>{t('subscription.levels')} 1-{maxLevel}</span>
            )}
          </div>
          {subscription.period_ends_at && (
            <div className="text-wanikani-text-light text-xs">
              {subscription.type === 'recurring' ? t('subscription.renews') : t('subscription.ends')}: {' '}
              {new Date(subscription.period_ends_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {maxLevel < 60 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-wanikani-border">
          <p className="text-wanikani-text-light text-sm">
            <strong className="text-wanikani-text">{t('subscription.note')}:</strong> {t('subscription.contentFiltered').replace('{level}', String(maxLevel))}
          </p>
        </div>
      )}
      
      {!subscription.active && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 text-sm">
            <strong>{t('subscription.notice')}:</strong> {t('subscription.inactiveNotice')}
          </p>
        </div>
      )}
    </div>
  )
}
