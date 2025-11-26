'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-wanikani-text dark:text-wanikani-text-dark rounded-lg transition-colors text-sm font-medium"
      title={language === 'en' ? 'Switch to Japanese' : 'Switch to English'}
    >
      {language === 'en' ? '日本語' : 'English'}
    </button>
  )
}
