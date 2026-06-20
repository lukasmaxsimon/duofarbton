import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media } from '@/payload-types'
import { HomeHero } from './components/HomeHero'
import { ProgrammeCarousel, type ProgrammItem } from './components/ProgrammeCarousel'
import './styles.css'
import './home.css'

export default async function HomePage() {
  const payload = await getPayload({ config: await config })

  const { docs } = await payload.find({
    collection: 'programme',
    sort: 'position',
    depth: 1,
    limit: 50,
  })

  const programme: ProgrammItem[] = docs.flatMap((p) => {
    if (!p.slug) return []

    const bild = typeof p.bild === 'object' ? (p.bild as Media) : null
    return [{
      titel: p.titel,
      untertitel: p.kartenUntertitel,
      slug: p.slug,
      bildUrl: bild?.url ?? null,
      bildAlt: bild?.alt ?? null,
      programminhalt: p.programminhalt,
      freitext: p.freitext,
      trailerUrl: p.trailerUrl,
      programmPdfUrl: p.programmPdfUrl,
    }]
  })

  return (
    <>
      {/* Fullscreen-Banner + Logo + Scroll-Fade ins Weiße */}
      <HomeHero />

      {/* Erste „Bildschirmhöhe": zeigt das fixierte Hero-Bild. */}
      <section className="home-spacer" />

      {/* Zweite Section: Programme als expandierendes Carousel. */}
      <section className="home-programme">
        <h2 className="home-programme__titel">Programme</h2>
        <ProgrammeCarousel items={programme} />
      </section>
    </>
  )
}
