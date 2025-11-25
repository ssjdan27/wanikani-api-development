'use client'

import { useState } from 'react'
import { Key, Sparkles } from 'lucide-react'

interface ApiTokenInputProps {
  onTokenSubmit: (token: string) => void
}

export default function ApiTokenInput({ onTokenSubmit }: ApiTokenInputProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter your API token')
      return
    }
    setError('')
    onTokenSubmit(token.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative floating kanji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[10%] left-[10%] text-6xl opacity-5 wk-kanji animate-float">学</span>
        <span className="absolute top-[20%] right-[15%] text-8xl opacity-5 wk-kanji animate-float" style={{ animationDelay: '0.5s' }}>日</span>
        <span className="absolute bottom-[30%] left-[5%] text-7xl opacity-5 wk-kanji animate-float" style={{ animationDelay: '1s' }}>本</span>
        <span className="absolute bottom-[15%] right-[10%] text-5xl opacity-5 wk-kanji animate-float" style={{ animationDelay: '1.5s' }}>語</span>
        <span className="absolute top-[50%] left-[50%] text-9xl opacity-3 wk-kanji">鰐</span>
      </div>
      
      <div className="wk-card rounded-2xl p-8 w-full max-w-md shadow-2xl relative z-10">
        {/* Decorative top border with gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wanikani-radical via-wanikani-kanji to-wanikani-vocabulary rounded-t-2xl"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-wanikani-kanji to-wanikani-vocabulary rounded-2xl mb-4 shadow-kanji transform hover:scale-105 transition-transform">
            <span className="text-4xl">🦀</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="wk-gradient-text">WaniKani Dashboard</span>
          </h1>
          <p className="text-gray-300 japanese-text">日本語学習の統計を見る</p>
          <p className="text-gray-400 text-sm mt-1">Enter your API token to view your statistics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-wanikani-kanji" />
              API Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your WaniKani API token"
              className="w-full px-4 py-3 bg-wanikani-darker/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wanikani-kanji/50 focus:border-wanikani-kanji/50 transition-all"
            />
            {error && <p className="text-wanikani-kanji text-sm mt-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-wanikani-kanji to-wanikani-vocabulary hover:from-wanikani-kanji/90 hover:to-wanikani-vocabulary/90 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-kanji hover:shadow-lg transform hover:scale-[1.02] wk-btn"
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Connect to WaniKani
            </span>
          </button>
        </form>

        <div className="wk-divider"></div>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Get your API token from your{' '}
            <a
              href="https://www.wanikani.com/settings/personal_access_tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-wanikani-radical hover:text-wanikani-kanji transition-colors underline decoration-dotted underline-offset-2"
            >
              WaniKani settings
            </a>
            {' '}and select the read-only scope.
          </p>
        </div>
      </div>
    </div>
  )
}
