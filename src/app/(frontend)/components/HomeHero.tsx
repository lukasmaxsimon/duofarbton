'use client'

import React, { useEffect } from 'react'

/**
 * Fullscreen-Hero der Startseite — Konzept „Aus dem Weiß heraus, ins Weiß zurück".
 *
 * Einstieg (Page Transition):
 *   - Das Bild taucht aus Weiß auf: von unscharf + leicht herangezoomt zu scharf.
 *   - Ein dezenter Scroll-Hinweis erscheint zum Schluss.
 *
 * Scroll-Animation:
 *   - Das Bild löst sich ins Weiß auf: sanfter Zoom-in, während eine weiße Fläche
 *     überblendet.
 *   - Das Logo (jetzt im SiteHeader) wandert nach oben links, schrumpft zur Marke
 *     und wechselt von Weiß zu Schwarz; die Navigations-Pill fährt von oben ein.
 *
 * Der Scroll-Fortschritt wird als CSS-Variablen auf <html> gesetzt:
 *   - `--scroll-fade` (0→1 über 100vh): Bild-Auflösung ins Weiß.
 *   - `--scroll-rest`  (verzögert ab REST_START): Zoom/Parallax + weiße Überblendung.
 *   - `--nav-progress` (0→1 über NAV_VH): Logo-Morph + Einfahren der Navigation.
 * Die eigentlichen Transforms passieren in CSS (home.css / header.css).
 */
export function HomeHero() {
  useEffect(() => {
    const root = document.documentElement

    // Bewegung reduzieren: ohne Trägheit, Wert direkt setzen.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Ab welchem Scroll-Fortschritt der „Rest" (weiße Fläche, Zoom, Parallax)
    // einsetzt. Davor passiert nur die Logo-Animation.
    const REST_START = 0.15

    // Über welche Strecke die Hero-Animation von 0→1 läuft (Anteil der Viewport-
    // Höhe). 1.0 = fertig bei 100vh. Die nächste Section tritt unabhängig davon
    // bereits bei 70vh ein (Spacer-Höhe in home.css), also während des Fades.
    const ANIM_VH = 1.0

    // Über welche Strecke der Navigations-Übergang (Logo-Morph + Pill) läuft.
    // 0.6 = vollständig „eingerastet" bei 60vh — also früher als die Bild-Auflösung.
    const NAV_VH = 0.6

    // Ziel = roher Scroll-Fortschritt (0 oben → 1 ganz weiß, über eine Viewport-Höhe).
    // current zieht dem Ziel sanft hinterher („scrub"/Trägheit, wie GSAP scrub) —
    // dadurch gleitet die Animation, statt 1:1 am Scroll zu kleben.
    let target = 0
    let current = 0
    let raf = 0
    let running = false

    const computeTarget = () => {
      target = Math.min(1, window.scrollY / (window.innerHeight * ANIM_VH))
    }

    // Setzt beide Variablen: --scroll-fade (Logo, ab 0) und --scroll-rest
    // (Rest, erst ab REST_START, danach auf 0→1 normiert).
    const applyVars = (wert: number) => {
      root.style.setProperty('--scroll-fade', wert.toFixed(4))
      const rest = Math.min(1, Math.max(0, (wert - REST_START) / (1 - REST_START)))
      root.style.setProperty('--scroll-rest', rest.toFixed(4))
      // `wert` entspricht (geglättet) scrollY/innerHeight (ANIM_VH = 1.0),
      // daher reicht das Teilen durch NAV_VH für den Navigations-Fortschritt.
      const nav = Math.min(1, wert / NAV_VH)
      root.style.setProperty('--nav-progress', nav.toFixed(4))
    }

    const tick = () => {
      // Annäherung pro Frame: kleiner Faktor = mehr Trägheit/Nachziehen.
      current += (target - current) * 0.09
      const fertig = Math.abs(target - current) < 0.0004
      if (fertig) current = target
      applyVars(current)
      if (fertig) {
        running = false
        return
      }
      raf = window.requestAnimationFrame(tick)
    }

    const start = () => {
      if (!running) {
        running = true
        raf = window.requestAnimationFrame(tick)
      }
    }

    const onScroll = () => {
      computeTarget()
      if (reduceMotion) {
        current = target
        applyVars(current)
      } else {
        start()
      }
    }

    // Initialwert ohne Animation setzen.
    computeTarget()
    current = target
    applyVars(current)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.cancelAnimationFrame(raf)
      root.style.removeProperty('--scroll-fade')
      root.style.removeProperty('--scroll-rest')
      root.style.removeProperty('--nav-progress')
    }
  }, [])

  return (
    <div className="home-hero" aria-hidden="true">
      {/* Banner-Bild — äußere Hülle macht den Einstieg, innere das Scroll-Verhalten. */}
      <div className="home-hero__bild-wrap">
        <div className="home-hero__bild" />
      </div>

      {/* Das Logo lebt jetzt im SiteHeader (morpht beim Scrollen zur Marke). */}

      {/* Dezenter Scroll-Hinweis (erscheint nach dem Einstieg, verblasst beim Scrollen). */}
      <div className="home-hero__scroll-hint">
        <span className="home-hero__scroll-line" />
      </div>

      {/* Weiße Fläche, die beim Scrollen überblendet. */}
      <div className="home-hero__fade" />
    </div>
  )
}
