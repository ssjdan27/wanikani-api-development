'use client'

import { useState } from 'react'
import Dashboard from '@/components/Dashboard'
import ApiTokenInput from '@/components/ApiTokenInput'

export default function Home() {
  const [apiToken, setApiToken] = useState('')

  return (
    <main className="min-h-screen bg-wanikani-dark">
      {apiToken ? (
        <Dashboard apiToken={apiToken} onTokenChange={setApiToken} />
      ) : (
        <ApiTokenInput onTokenSubmit={setApiToken} />
      )}
    </main>
  )
}
