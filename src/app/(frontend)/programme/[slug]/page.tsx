import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { Fragment } from 'react'

import config from '@/payload.config'
import type { Media } from '@/payload-types'
import { RefreshRouteOnSave } from '../../components/RefreshRouteOnSave'

export default async function ProgrammPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })

  const { docs } = await payload.find({
    collection: 'programme',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const programm = docs[0]
  if (!programm) notFound()

  const bild = typeof programm.bild === 'object' ? (programm.bild as Media) : null

  return (
    <Fragment>
      {/* Aktualisiert die Live-Preview im Admin bei jedem Speichern. */}
      <RefreshRouteOnSave />

      <article style={{ maxWidth: 768, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1>{programm.titel}</h1>
        {programm.kartenUntertitel && <p>{programm.kartenUntertitel}</p>}

        {bild?.url && (
          <Image
            alt={bild.alt || programm.titel}
            src={bild.url}
            width={bild.width || 1200}
            height={bild.height || 800}
            style={{ width: '100%', height: 'auto' }}
          />
        )}

        {programm.programminhalt && <RichText data={programm.programminhalt} />}

        {programm.freitext && <p style={{ whiteSpace: 'pre-wrap' }}>{programm.freitext}</p>}

        <p>
          {programm.trailerUrl && (
            <a href={programm.trailerUrl} rel="noopener noreferrer" target="_blank">
              Trailer ansehen
            </a>
          )}
          {programm.programmPdfUrl && (
            <a
              href={programm.programmPdfUrl}
              rel="noopener noreferrer"
              target="_blank"
              style={{ marginLeft: programm.trailerUrl ? '1rem' : 0 }}
            >
              Programm-PDF
            </a>
          )}
        </p>
      </article>
    </Fragment>
  )
}
