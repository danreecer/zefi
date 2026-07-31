import type { MetadataRoute } from 'next'

import { publicConfig } from '@/lib/config/public'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The application area is per-user and requires a session; there is
        // nothing there for a crawler to index.
        disallow: ['/app', '/app/', '/api/', '/sign-in', '/sign-up', '/og-preview'],
      },
    ],
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
    host: publicConfig.appUrl,
  }
}
