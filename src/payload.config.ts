import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

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

export default buildConfig({
  // serverURL/cors/csrf nur in Produktion setzen (über PAYLOAD_PUBLIC_SERVER_URL);
  // lokal + Vercel-Preview greifen die Defaults (Request-URL).
  ...(serverURL ? { serverURL, cors: [serverURL], csrf: [serverURL] } : {}),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
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
