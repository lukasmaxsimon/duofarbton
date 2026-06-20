import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Programme } from './collections/Programme'
import { Pages } from './collections/Pages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL || ''
// Lokal (Docker-Postgres) ohne TLS; Neon liefert öffentlich vertrauenswürdige
// Zertifikate (sslmode=require) → reguläre Chain-Prüfung. Sollte Neon wider
// Erwarten einen Cert-Fehler werfen, hier auf { rejectUnauthorized: false } stellen.
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(databaseUrl)

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL

// PAYLOAD_SECRET signiert Login-JWTs/Cookies — in Produktion zwingend setzen.
const secret = process.env.PAYLOAD_SECRET || ''
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('PAYLOAD_SECRET fehlt — in Produktion zwingend setzen.')
}

// Doc-Form für die SEO-Generatoren (Programme + Seiten teilen titel/slug).
type SeoDoc = { titel?: string | null; slug?: string | null }

// Default-Meta-Titel: „<Titel> – Duo Farbton", fällt auf den Markennamen zurück.
const generateTitle: GenerateTitle<SeoDoc> = ({ doc }) =>
  doc?.titel ? `${doc.titel} – Duo Farbton` : 'Duo Farbton'

// Vorschau-URL im SEO-Snippet: /programme/<slug> bzw. /<slug> (Home → /).
const generateURL: GenerateURL<SeoDoc> = ({ doc, collectionSlug }) => {
  const base = serverURL || 'https://duofarbton.de'
  if (collectionSlug === 'programme' && doc?.slug) return `${base}/programme/${doc.slug}`
  if (collectionSlug === 'pages' && doc?.slug && doc.slug !== 'home') return `${base}/${doc.slug}`
  return base
}

export default buildConfig({
  // serverURL/cors/csrf nur in Produktion setzen (über PAYLOAD_PUBLIC_SERVER_URL);
  // lokal + Vercel-Preview greifen die Defaults (Request-URL).
  ...(serverURL ? { serverURL, cors: [serverURL], csrf: [serverURL] } : {}),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Live Preview: Admin lädt die Frontend-Detailseite in einem iframe und
    // aktualisiert sie bei jedem Speichern.
    livePreview: {
      url: ({ data, collectionConfig }) => {
        const pfad =
          collectionConfig?.slug === 'programme' && data?.slug
            ? `/programme/${data.slug}`
            : '/'
        // Prod: absolut über serverURL. Lokal: relativ → gleiche Origin/Port wie
        // der Admin (egal ob :3000, :3001, …); kein hartkodierter Port.
        return serverURL ? `${serverURL}${pfad}` : pfad
      },
      collections: ['programme'],
      breakpoints: [
        { label: 'Mobil', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  collections: [Users, Media, Programme, Pages],
  editor: lexicalEditor(),
  secret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
      ssl: isLocalDatabase ? false : { rejectUnauthorized: true },
    },
    // push nur als lokaler Notnagel (PAYLOAD_DB_PUSH=true); sonst Migrationen.
    push: process.env.PAYLOAD_DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [
    // SEO-Plugin: ergänzt Programme + Seiten um eine „SEO"-Group (Meta-Titel,
    // -Beschreibung, OG-Bild) mit Live-Vorschau auf das Google-Snippet.
    seoPlugin({
      collections: ['programme', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle,
      generateURL,
    }),
    // Medien-Storage env-gated: Mit BLOB_READ_WRITE_TOKEN (Prod/Preview auf Vercel)
    // gehen Uploads in Vercel Blob; ohne Token (lokal) auf die Festplatte.
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
