'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Hüllt Inhalte ein und blendet sie beim Hereinscrollen sanft ein
 * (fade + leichtes Hochschieben). Nutzt IntersectionObserver, läuft nur
 * einmal pro Element und respektiert `prefers-reduced-motion` (CSS).
 */
type RevealProps = {
  children: React.ReactNode
  className?: string
  /** Verzögerung in ms – für gestaffelte Animationen innerhalb einer Sektion. */
  delayMs?: number
}

export function Reveal({ children, className = '', delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
