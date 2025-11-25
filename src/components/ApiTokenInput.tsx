'use client'

import { useState } from 'react'
import { Key } from 'lucide-react'

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
    <div className="min-h-screen bg-wanikani-bg flex items-center justify-center p-4">
      <div className="wk-card rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-wanikani-pink rounded-full mb-4">
            <span className="text-4xl">🦀</span>
          </div>
          <h1 className="text-2xl font-bold text-wanikani-text mb-2">WaniKani Dashboard</h1>
          <p className="text-wanikani-text-light">Enter your API token to view your statistics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-wanikani-text mb-2">
              API Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your WaniKani API token"
              className="w-full px-4 py-3 bg-white border border-wanikani-border rounded-lg text-wanikani-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wanikani-pink focus:border-transparent"
            />
            {error && <p className="text-wanikani-pink text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-wanikani-pink hover:bg-pink-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Connect to WaniKani
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-wanikani-text-light">
            Get your API token from your{' '}
            <a
              href="https://www.wanikani.com/settings/personal_access_tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-wanikani-cyan hover:underline"
            >
              WaniKani settings
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
