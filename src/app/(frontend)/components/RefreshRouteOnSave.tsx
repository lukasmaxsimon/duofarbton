'use client'

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import React from 'react'

/**
 * Lauscht im Live-Preview-iframe auf Speicher-Events des Admin-Panels und lädt
 * die Route neu. Admin und Frontend laufen in derselben Next.js-App (gleiche
 * Origin), daher genügt `window.location.origin` als serverURL; optional per
 * NEXT_PUBLIC_SERVER_URL überschreibbar (kein Secret).
 */
export const RefreshRouteOnSave: React.FC = () => {
  const router = useRouter()
  const serverURL =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  return <PayloadLivePreview refresh={() => router.refresh()} serverURL={serverURL} />
}
