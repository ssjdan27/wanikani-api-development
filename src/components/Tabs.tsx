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
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 border wk-btn ${
        isActive
          ? 'bg-gradient-to-r from-wanikani-kanji to-wanikani-vocabulary border-wanikani-kanji/50 text-white shadow-kanji'
          : 'bg-wanikani-darker/50 border-gray-700/50 text-gray-300 hover:text-white hover:border-wanikani-kanji/30 hover:bg-wanikani-darker'
      }`}
    >
      {label}
    </button>
  )
}
