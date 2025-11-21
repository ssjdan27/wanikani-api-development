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
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
        isActive
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
      }`}
    >
      {label}
    </button>
  )
}
