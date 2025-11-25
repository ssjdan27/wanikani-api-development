'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import ApiTokenInput from '@/components/ApiTokenInput'

export default function Home() {
  const [apiToken, setApiToken] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load token from localStorage on component mount
  useEffect(() => {
    if (isClient) {
      try {
        const savedToken = localStorage.getItem('wanikani-api-token')
        console.log('Loading saved token:', savedToken ? 'Token found' : 'No token found')
        if (savedToken) {
          setApiToken(savedToken)
        }
      } catch (error) {
        console.error('Error loading token from localStorage:', error)
      }
      setIsLoading(false)
    }
  }, [isClient])

  // Save token to localStorage when it changes
  const handleTokenChange = (token: string) => {
    console.log('Token change:', token ? 'Setting token' : 'Clearing token')
    setApiToken(token)
    
    if (isClient) {
      try {
        if (token) {
          localStorage.setItem('wanikani-api-token', token)
          console.log('Token saved to localStorage')
        } else {
          localStorage.removeItem('wanikani-api-token')
          console.log('Token removed from localStorage')
        }
      } catch (error) {
        console.error('Error saving token to localStorage:', error)
      }
    }
  }

  // Show loading state while checking for saved token
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-wanikani-kanji to-wanikani-vocabulary flex items-center justify-center mx-auto mb-4 shadow-kanji animate-pulse">
            <span className="text-2xl">🦀</span>
          </div>
          <p className="text-gray-300 japanese-text">読み込み中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {apiToken ? (
        <Dashboard apiToken={apiToken} onTokenChange={handleTokenChange} />
      ) : (
        <ApiTokenInput onTokenSubmit={handleTokenChange} />
      )}
    </main>
  )
}
