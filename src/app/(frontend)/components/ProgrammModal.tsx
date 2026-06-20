'use client'

import { RichText } from '@payloadcms/richtext-lexical/react'
import React, { useEffect, useRef } from 'react'

import type { ProgrammItem } from './ProgrammeCarousel'

/**
 * Bottom-Sheet mit den restlichen Programm-Infos (Programminhalt, Freitext,
 * Trailer- und PDF-Link). Fährt von unten in den Screen.
 *
 * Steuerung von außen: `item` (Inhalt) + `show` (offen/zu). Während des
 * Schließens bleibt `item` noch gesetzt, damit die Ausfahr-Animation läuft.
 */
export function ProgrammModal({
  item,
  show,
  onClose,
}: {
  item: ProgrammItem | null
  show: boolean
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Escape schließt das Sheet.
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  // Hintergrund-Scroll sperren, solange offen (Lenis pausieren + nativer Lock).
  useEffect(() => {
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis
    if (show) {
      lenis?.stop()
      document.documentElement.style.overflow = 'hidden'
      // Fokus ins Sheet ziehen.
      sheetRef.current?.focus()
    } else {
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
    return () => {
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
  }, [show])

  if (!item) return null

  return (
    <div className={`pm${show ? ' is-open' : ''}`}>
      <div className="pm__backdrop" onClick={onClose} />

      <div
        ref={sheetRef}
        className="pm__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={item.titel}
        tabIndex={-1}
        data-lenis-prevent
      >
        <span className="pm__griff" aria-hidden="true" />

        <button type="button" className="pm__close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>

        <div className="pm__inner">
          <h2 className="pm__titel">{item.titel}</h2>
          {item.untertitel && <p className="pm__sub">{item.untertitel}</p>}

          {item.programminhalt && (
            <div className="pm__rt">
              <RichText data={item.programminhalt as Parameters<typeof RichText>[0]['data']} />
            </div>
          )}

          {item.freitext && <p className="pm__freitext">{item.freitext}</p>}

          {(item.trailerUrl || item.programmPdfUrl) && (
            <div className="pm__links">
              {item.trailerUrl && (
                <a
                  className="pm__link"
                  href={item.trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Trailer ansehen
                </a>
              )}
              {item.programmPdfUrl && (
                <a
                  className="pm__link"
                  href={item.programmPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Programm-PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
