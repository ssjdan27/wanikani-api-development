'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'sakura' | 'crabigator' | 'midnight' | 'ocean'

export const themes: { id: Theme; name: string; nameJa: string; icon: string }[] = [
  { id: 'light', name: 'Light', nameJa: 'ライト', icon: '☀️' },
  { id: 'dark', name: 'Dark', nameJa: 'ダーク', icon: '🌙' },
  { id: 'sakura', name: 'Sakura', nameJa: '桜', icon: '🌸' },
  { id: 'crabigator', name: 'Crabigator', nameJa: 'クラビゲーター', icon: '🦀' },
  { id: 'midnight', name: 'Midnight', nameJa: '真夜中', icon: '🌌' },
  { id: 'ocean', name: 'Ocean', nameJa: '海', icon: '🌊' },
]

// Helper to determine if a theme is "dark mode"
const isDarkTheme = (theme: Theme): boolean => {
  return ['dark', 'midnight', 'ocean'].includes(theme)
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('wanikani-dashboard-theme') as Theme
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      setThemeState(savedTheme)
      applyTheme(savedTheme)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        setThemeState('dark')
        applyTheme('dark')
      }
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    // Remove all theme classes
    themes.forEach(t => root.classList.remove(t.id))
    root.classList.remove('dark')
    // Add current theme class
    root.classList.add(newTheme)
    // Add 'dark' class for dark-mode themes (for Tailwind dark: variants)
    if (isDarkTheme(newTheme)) {
      root.classList.add('dark')
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('wanikani-dashboard-theme', newTheme)
    applyTheme(newTheme)
  }

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].id)
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  const isDark = isDarkTheme(theme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
