import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { LanguageProvider } from '@/contexts/LanguageContext'

export const metadata: Metadata = {
    title: 'WaniKani Dashboard',
    description: 'Advanced WaniKani statistics and progress tracking',
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦀</text></svg>',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="bg-wanikani-bg min-h-screen">
                <LanguageProvider>
                    {children}
                </LanguageProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
