'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { themes, Theme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ThemeToggle() {
  const { theme, setTheme, cycleTheme } = useTheme()
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentTheme = themes.find(t => t.id === theme) || themes[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button - click for dropdown, double-click or long press to cycle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onDoubleClick={() => {
          cycleTheme()
          setIsOpen(false)
        }}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-wanikani-text dark:text-gray-200 rounded-lg transition-colors"
        title={language === 'ja' ? 'テーマを選択' : 'Select theme'}
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className="text-sm font-medium hidden sm:inline">
          {language === 'ja' ? currentTheme.nameJa : currentTheme.name}
        </span>
        <Palette className="w-4 h-4" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="py-1">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === t.id ? 'bg-gray-50 dark:bg-gray-750' : ''
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="flex-1 text-sm text-wanikani-text dark:text-gray-200">
                  {language === 'ja' ? t.nameJa : t.name}
                </span>
                {theme === t.id && (
                  <Check className="w-4 h-4 text-wanikani-radical" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
