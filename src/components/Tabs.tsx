'use client'

import { useState } from 'react'

export function useTabState<T extends string>(initial: T) {
  const [activeTab, setActiveTab] = useState<T>(initial)
  return { activeTab, setActiveTab }
}

interface TabButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

export function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-wanikani-pink text-white'
          : 'bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 border border-wanikani-border dark:border-wanikani-border-dark'
      }`}
    >
      {label}
    </button>
  )
}
