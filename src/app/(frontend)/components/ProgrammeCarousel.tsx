'use client'

import React, { useState } from 'react'

import type { Programme } from '@/payload-types'
import { ProgrammModal } from './ProgrammModal'

export type ProgrammItem = {
  titel: string
  untertitel?: string | null
  slug: string
  bildUrl?: string | null
  bildAlt?: string | null
  programminhalt?: Programme['programminhalt']
  freitext?: string | null
  trailerUrl?: string | null
  programmPdfUrl?: string | null
}

/**
 * Expandierendes Programm-Carousel (vertikale Panels).
 *
 * Eines ist immer geöffnet (Standard: das erste). Beim Hovern oder Fokussieren
 * eines Panels wächst dieses und zeigt Titel, Untertitel und einen Button
 * „Mehr erfahren". Ein Klick darauf öffnet ein Bottom-Sheet mit den restlichen
 * Infos des Programms (Programminhalt, Freitext, Trailer-/PDF-Link).
 *
 * Auf kleinen Bildschirmen werden die Panels zu gestapelten Karten mit
 * dauerhaft sichtbaren Meta-Infos (siehe home.css).
 */
export function ProgrammeCarousel({ items }: { items: ProgrammItem[] }) {
  const [aktiv, setAktiv] = useState(0)

  // Modal-Steuerung: Inhalt (modalItem) + sichtbar (visible). Beim Schließen
  // bleibt modalItem kurz erhalten, damit die Ausfahr-Animation laufen kann.
  const [modalItem, setModalItem] = useState<ProgrammItem | null>(null)
  const [visible, setVisible] = useState(false)

  const openModal = (item: ProgrammItem) => {
    setModalItem(item)
    // Erst im nächsten Frame öffnen, damit die Einfahr-Animation greift.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }

  const closeModal = () => {
    setVisible(false)
    window.setTimeout(() => setModalItem(null), 560)
  }

  return (
    <>
      {/* Kein Reset beim Verlassen: die zuletzt geöffnete Karte bleibt aktiv. */}
      <div className="pc-row">
        {items.map((p, i) => {
          const istAktiv = i === aktiv
          return (
            <div
              key={p.slug}
              className={`pc-panel${istAktiv ? ' is-active' : ''}`}
              onMouseEnter={() => setAktiv(i)}
            >
              {/* Bild */}
              {p.bildUrl && (
                // Payload-Media direkt laden; vermeidet lokale Next-Image-Optimizer-Brüche.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pc-panel__img"
                  src={p.bildUrl}
                  alt={p.bildAlt || p.titel}
                />
              )}

              {/* Abdunklung für Lesbarkeit */}
              <span className="pc-panel__scrim" />

              {/* Index oben rechts */}
              <span className="pc-panel__index">{String(i + 1).padStart(2, '0')}</span>

              {/* Vertikaler Titel (nur sichtbar, wenn das Panel geschlossen ist) */}
              <span className="pc-panel__vtitel" aria-hidden="true">
                {p.titel}
              </span>

              {/* Meta-Infos (nur sichtbar, wenn geöffnet) */}
              <div className="pc-panel__meta">
                <span className="pc-panel__titel">{p.titel}</span>
                {p.untertitel && <span className="pc-panel__sub">{p.untertitel}</span>}
                <button
                  type="button"
                  className="pc-panel__cta"
                  onClick={() => openModal(p)}
                  onFocus={() => setAktiv(i)}
                >
                  Mehr erfahren
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom-Sheet mit den restlichen Programm-Infos */}
      <ProgrammModal item={modalItem} show={visible} onClose={closeModal} />
    </>
  )
}
