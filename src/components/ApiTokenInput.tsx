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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-wanikani-darker rounded-xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">🦀 WaniKani Dashboard</h1>
          <p className="text-gray-300">Enter your API token to view your statistics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              API Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your WaniKani API token"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Connect to WaniKani
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Get your API token from your{' '}
            <a
              href="https://www.wanikani.com/settings/personal_access_tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              WaniKani settings
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
