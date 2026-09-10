import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'

import { publicConfig } from '@/lib/config/public'
import { BaseProviders } from './providers'
import './globals.css'

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-zefi-display',
  display: 'swap',
})

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-zefi-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-zefi-mono',
  display: 'swap',
})

const title = 'ZeFi — The AI operating system for onchain finance'
const description =
  'Research markets, understand your wallet, model complex transactions, and turn natural-language intent into verified onchain actions.'

export const metadata: Metadata = {
  metadataBase: new URL(publicConfig.appUrl),
  title: {
    default: title,
    template: '%s — ZeFi',
  },
  description,
  applicationName: 'ZeFi',
  keywords: [
    'onchain intelligence',
    'AI crypto assistant',
    'transaction simulation',
    'intent to execution',
    'agentic finance',
    'multichain expansion',
    'Routefold',
  ],
  authors: [{ name: 'ZeFi', url: publicConfig.appUrl }],
  creator: 'ZeFi',
  publisher: 'ZeFi',
  openGraph: {
    type: 'website',
    url: publicConfig.appUrl,
    siteName: 'ZeFi',
    title,
    description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
  // Domain-ownership proof for Orynth. Renders on every route, because a
  // verifier may fetch any of them.
  verification: { other: { 'ory-verify': 'orynth-158b633ccb8f4d1993da1e7b4d196bd6' } },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFAF4' },
    { media: '(prefers-color-scheme: dark)', color: '#17130F' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <BaseProviders>{children}</BaseProviders>
      </body>
    </html>
  )
}
