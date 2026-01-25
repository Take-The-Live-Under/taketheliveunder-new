import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Take The Live Under - NCAA Basketball Analytics',
  description: 'Real-time NCAA basketball scoring pace analysis and predictions. Track live game momentum, points per minute trends, and AI-powered projections.',
  keywords: 'NCAA basketball, college basketball, basketball analytics, pace analysis, PPM, points per minute, game predictions, scoring trends',
  authors: [{ name: 'Take The Live Under' }],
  creator: 'Take The Live Under',
  publisher: 'Take The Live Under',
  robots: 'index, follow',
  openGraph: {
    title: 'Take The Live Under - NCAA Basketball Analytics',
    description: 'Real-time NCAA basketball scoring pace analysis and predictions platform',
    url: 'https://taketheliveunder.com',
    siteName: 'Take The Live Under',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Take The Live Under - NCAA Basketball Analytics',
    description: 'Real-time NCAA basketball scoring pace analysis and predictions',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
