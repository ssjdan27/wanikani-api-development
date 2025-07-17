import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
    title: 'WaniKani Dashboard',
    description: 'Advanced WaniKani statistics and progress tracking',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="bg-wanikani-dark">
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
