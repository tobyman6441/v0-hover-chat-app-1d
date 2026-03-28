import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { FeedbackButton } from '@/components/feedback-button'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Hover Ninja - AI-Powered Chat for Hover',
  description: 'Connect your favorite LLM and Hover workspace for AI-powered conversations.',
  icons: {
    icon: '/images/hover-ninja-logo.png',
    apple: '/images/hover-ninja-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <FeedbackButton />
        <Analytics />
      </body>
    </html>
  )
}
