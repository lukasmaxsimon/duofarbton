'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { LogoLetters } from './LogoLetters'

/**
 * Globale Navigation als „Pill", die beim Herunterscrollen vom oberen Rand
 * einfährt. Das Logo links ist ein eigenes, fixiertes Element, das aus der
 * Hero-Mitte (groß, weiß) in den linken Pill-Slot morpht (klein, schwarz).
 *
 * Gesteuert über die CSS-Variable `--nav-progress` (0 → 1):
 *   - Auf der Startseite setzt sie der `HomeHero` beim Scrollen.
 *   - Auf Unterseiten gibt es keinen Hero → hier fix auf 1 (Leiste dauerhaft sichtbar).
 *
 * Layout: links Logo · Mitte Navigation · rechts Button „Kontakt".
 * Mobil (< 768px): Navigation + Button klappen in ein Burger-Overlay.
 */
const NAV_LINKS = [
  { label: 'das duo', href: '/das-duo' },
  { label: 'Live', href: '/live' }, // TODO Route anlegen
  { label: 'Blog', href: '/blog' }, // TODO Route anlegen
  { label: 'Presse', href: '/presse' }, // TODO Route anlegen
]

export function SiteHeader() {
  const pathname = usePathname()
  const istStart = pathname === '/'
  const [menuOffen, setMenuOffen] = useState(false)

  // Mobiles Menü bei Seitenwechsel schließen (Reset während Render statt im Effect).
  const [vorigerPfad, setVorigerPfad] = useState(pathname)
  if (vorigerPfad !== pathname) {
    setVorigerPfad(pathname)
    setMenuOffen(false)
  }

  // Unterseiten: kein HomeHero setzt --nav-progress → fix auf 1 (Endzustand).
  useEffect(() => {
    if (istStart) return
    const root = document.documentElement
    root.style.setProperty('--nav-progress', '1')
    return () => {
      root.style.removeProperty('--nav-progress')
    }
  }, [istStart])

  return (
    <header className="site-header">
      {/* Navigations-Pill — nur die Links, erscheint erst nachdem das Logo oben ist. */}
      <div className="site-header__pill">
        <nav className="site-header__nav" aria-label="Hauptnavigation">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="site-header__link">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Morphendes Logo — eigenes fixes Element (links, außerhalb der Pill). */}
      <Link href="/" className="brand-logo-link" aria-label="Duo Farbton – Startseite">
        <LogoLetters />
      </Link>

      {/* Kontakt-Button — eigenes Element rechts (außerhalb der Pill). */}
      <Link href="/kontakt" className="site-header__cta">
        Kontakt
      </Link>

      {/* Burger nur mobil (rechts). */}
      <button
        type="button"
        className="site-header__burger"
        aria-expanded={menuOffen}
        aria-controls="hauptmenue-mobil"
        onClick={() => setMenuOffen((v) => !v)}
      >
        <span className="visually-hidden">Menü {menuOffen ? 'schließen' : 'öffnen'}</span>
        <span className="site-header__burger-icon" aria-hidden="true" />
      </button>

      {/* Mobiles Overlay-Menü */}
      <div
        id="hauptmenue-mobil"
        className="site-header__mobil"
        data-offen={menuOffen ? '' : undefined}
        hidden={!menuOffen}
      >
        <nav aria-label="Hauptnavigation (mobil)">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="site-header__mobil-link">
              {l.label}
            </Link>
          ))}
          <Link href="/kontakt" className="site-header__mobil-link">
            Kontakt
          </Link>
        </nav>
      </div>
    </header>
  )
}
