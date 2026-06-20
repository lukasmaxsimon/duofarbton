'use client'

import 'lenis/dist/lenis.css'

import Lenis from 'lenis'
import { useEffect } from 'react'

/**
 * Globales Smooth-Scroll (Lenis). Fängt das native Scrollen ab und interpoliert
 * es mit Trägheit/Momentum — die ganze Seite gleitet, statt in OS-Stufen zu
 * springen. Lenis bewegt die echte Scroll-Position, daher bleiben `window.scrollY`
 * und native `scroll`-Events korrekt (der Hero-Effekt funktioniert unverändert).
 *
 * Bei `prefers-reduced-motion` wird Lenis nicht aktiviert (natives Scrollen).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.2,
      // Exponentielles Ease-out (Lenis-Standard) — weiches Ausgleiten.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    // Global verfügbar machen, damit Overlays (z. B. das Programm-Sheet) den
    // Hintergrund-Scroll pausieren können (lenis.stop()/start()).
    ;(window as Window & { __lenis?: Lenis }).__lenis = lenis

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = window.requestAnimationFrame(loop)
    }
    raf = window.requestAnimationFrame(loop)

    return () => {
      window.cancelAnimationFrame(raf)
      lenis.destroy()
      delete (window as Window & { __lenis?: Lenis }).__lenis
    }
  }, [])

  return null
}
