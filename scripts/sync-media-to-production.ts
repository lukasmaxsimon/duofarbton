import { head, put, type HeadBlobResult } from '@vercel/blob'
import { config as loadEnv } from 'dotenv'
import { Client } from 'pg'

loadEnv({ path: '.env.media-sync.local' })
loadEnv()

type MediaRow = Record<string, Date | null | number | string>

type Args = {
  allowMissingBlobs: boolean
  apply: boolean
  blobsOnly: boolean
  dbOnly: boolean
  overwriteExisting: boolean
}

const args: Args = {
  allowMissingBlobs: process.argv.includes('--allow-missing-blobs'),
  apply: process.argv.includes('--apply'),
  blobsOnly: process.argv.includes('--blobs-only'),
  dbOnly: process.argv.includes('--db-only'),
  overwriteExisting: process.argv.includes('--overwrite-existing'),
}

const usage = `
Medien aus einem Neon-DB-Branch in eine Ziel-DB + Vercel Blob kopieren.

Dry-run:
  cp .env.media-sync.example .env.media-sync.local
  # .env.media-sync.local mit echten Werten befuellen
  pnpm sync:media

Anwenden:
  pnpm sync:media -- --apply

Optionen:
  --apply                 schreibt in Ziel-Blob/Ziel-DB
  --overwrite-existing    aktualisiert Ziel-Zeilen mit gleicher media.id
  --db-only               kopiert nur media-DB-Zeilen
  --blobs-only            kopiert nur Blob-Dateien
  --allow-missing-blobs   schreibt DB-Zeilen auch, wenn die Quelldatei fehlt

Env:
  MEDIA_SYNC_SOURCE_DATABASE_URL   Neon-Connection-String des Branches mit Medien
  MEDIA_SYNC_TARGET_DATABASE_URL   Neon-Connection-String von Production
  MEDIA_SYNC_SOURCE_BLOB_TOKEN     Vercel-Blob-Read-Write-Token der Quelle
  MEDIA_SYNC_TARGET_BLOB_TOKEN     Vercel-Blob-Read-Write-Token des Ziels
`

const env = process.env
const sourceDatabaseUrl = env.MEDIA_SYNC_SOURCE_DATABASE_URL || env.SOURCE_DATABASE_URL
const targetDatabaseUrl = env.MEDIA_SYNC_TARGET_DATABASE_URL || env.TARGET_DATABASE_URL
const sourceBlobToken =
  env.MEDIA_SYNC_SOURCE_BLOB_TOKEN || env.SOURCE_BLOB_READ_WRITE_TOKEN || env.BLOB_READ_WRITE_TOKEN
const targetBlobToken =
  env.MEDIA_SYNC_TARGET_BLOB_TOKEN || env.TARGET_BLOB_READ_WRITE_TOKEN || env.BLOB_READ_WRITE_TOKEN

const quoteIdent = (value: string): string => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Unsicherer SQL-Identifier: ${value}`)
  }
  return `"${value}"`
}

const createClient = (connectionString: string): Client =>
  new Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: true },
  })

const getStoreBaseUrl = (token: string | undefined): string | null => {
  const storeId = token?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  return storeId ? `https://${storeId}.public.blob.vercel-storage.com` : null
}

const getBlobPathname = (row: MediaRow): string | null => {
  const filename = row.filename
  if (typeof filename === 'string' && filename.length > 0) return filename

  const url = row.url
  if (typeof url !== 'string' || url.length === 0) return null

  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''))
  } catch {
    return null
  }
}

const buildBlobUrl = (baseUrl: string | null, pathname: string | null): string | null => {
  if (!baseUrl || !pathname) return null
  const parts = pathname.split('/').map((part) => encodeURIComponent(part))
  return `${baseUrl}/${parts.join('/')}`
}

const rowForTarget = (row: MediaRow, targetBaseUrl: string | null): MediaRow => {
  const pathname = getBlobPathname(row)
  const nextRow = { ...row }
  const targetUrl = buildBlobUrl(targetBaseUrl, pathname)

  if (targetUrl) {
    nextRow.url = targetUrl
  }

  return nextRow
}

const normalizeValue = (value: unknown): unknown =>
  value instanceof Date ? value.toISOString() : value

const rowsDiffer = (columns: string[], source: MediaRow, target: MediaRow): boolean =>
  columns.some((column) => normalizeValue(source[column]) !== normalizeValue(target[column]))

const listMediaColumns = async (client: Client): Promise<string[]> => {
  const result = await client.query<{ column_name: string }>(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'media'
      order by ordinal_position
    `,
  )

  if (result.rows.length === 0) {
    throw new Error('Tabelle public.media wurde nicht gefunden.')
  }

  return result.rows.map((row) => row.column_name)
}

const readMediaRows = async (client: Client): Promise<MediaRow[]> => {
  const result = await client.query<MediaRow>('select * from media order by id asc')
  return result.rows
}

const getBlobHead = async (pathname: string, token: string): Promise<HeadBlobResult | null> => {
  try {
    return await head(pathname, { token })
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('not found') || message.includes('does not exist')) return null
    throw error
  }
}

const copyBlob = async (row: MediaRow): Promise<'copied' | 'exists' | 'missing' | 'skipped'> => {
  const pathname = getBlobPathname(row)
  if (!pathname || !sourceBlobToken || !targetBlobToken) return 'skipped'

  if (await getBlobHead(pathname, targetBlobToken)) return 'exists'

  const sourceHead = await getBlobHead(pathname, sourceBlobToken)
  if (!sourceHead) return 'missing'

  if (!args.apply) return 'copied'

  const sourceResponse = await fetch(sourceHead.url)
  if (!sourceResponse.ok || !sourceResponse.body) return 'missing'

  await put(pathname, sourceResponse.body, {
    access: 'public',
    allowOverwrite: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType:
      typeof row.mime_type === 'string' && row.mime_type.length > 0
        ? row.mime_type
        : sourceHead.contentType,
    multipart: typeof row.filesize === 'number' && row.filesize > 100 * 1024 * 1024,
    token: targetBlobToken,
  })

  return 'copied'
}

const insertRow = async (client: Client, columns: string[], row: MediaRow): Promise<void> => {
  const quotedColumns = columns.map(quoteIdent).join(', ')
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
  const values = columns.map((column) => row[column])

  await client.query(
    `insert into "media" (${quotedColumns}) values (${placeholders}) on conflict ("id") do nothing`,
    values,
  )
}

const updateRow = async (client: Client, columns: string[], row: MediaRow): Promise<void> => {
  const updateColumns = columns.filter((column) => column !== 'id')
  const assignments = updateColumns
    .map((column, index) => `${quoteIdent(column)} = $${index + 1}`)
    .join(', ')
  const values = updateColumns.map((column) => row[column])

  await client.query(`update "media" set ${assignments} where "id" = $${values.length + 1}`, [
    ...values,
    row.id,
  ])
}

const resetMediaSequence = async (client: Client): Promise<void> => {
  await client.query(`
    select setval(
      pg_get_serial_sequence('media', 'id'),
      coalesce((select max(id) from media), 1),
      (select count(*) > 0 from media)
    )
  `)
}

const assertConfig = (): void => {
  if (args.dbOnly && args.blobsOnly) {
    throw new Error('--db-only und --blobs-only koennen nicht kombiniert werden.')
  }

  if (!sourceDatabaseUrl || !targetDatabaseUrl) {
    throw new Error(`SOURCE/TARGET Database URL fehlt.${usage}`)
  }

  if (!args.dbOnly && (!sourceBlobToken || !targetBlobToken)) {
    console.warn(
      'Blob-Tokens fehlen oder sind unvollstaendig. Blob-Kopie wird uebersprungen; DB-Sync bleibt im Dry-Run sichtbar.',
    )
  }
}

const run = async (): Promise<void> => {
  assertConfig()

  const sourceClient = createClient(sourceDatabaseUrl as string)
  const targetClient = createClient(targetDatabaseUrl as string)
  const targetBaseUrl = getStoreBaseUrl(targetBlobToken)

  await sourceClient.connect()
  await targetClient.connect()

  try {
    const [sourceColumns, targetColumns, sourceRows, targetRows] = await Promise.all([
      listMediaColumns(sourceClient),
      listMediaColumns(targetClient),
      readMediaRows(sourceClient),
      readMediaRows(targetClient),
    ])

    const columns = sourceColumns.filter((column) => targetColumns.includes(column))
    const targetById = new Map(targetRows.map((row) => [row.id, row]))
    const targetByFilename = new Map(
      targetRows
        .filter((row) => typeof row.filename === 'string' && row.filename.length > 0)
        .map((row) => [row.filename, row]),
    )

    let copiedBlobs = 0
    let existingBlobs = 0
    let insertedRows = 0
    let updatedRows = 0
    let skippedRows = 0
    let conflicts = 0
    let missingBlobs = 0

    console.info(`${args.apply ? 'APPLY' : 'DRY-RUN'}: ${sourceRows.length} Media-Zeilen gefunden.`)

    for (const sourceRow of sourceRows) {
      const pathname = getBlobPathname(sourceRow)
      const filename = sourceRow.filename
      const targetRow = targetById.get(sourceRow.id)
      const filenameConflict =
        typeof filename === 'string' && targetByFilename.has(filename)
          ? targetByFilename.get(filename)
          : undefined

      if (filenameConflict && filenameConflict.id !== sourceRow.id) {
        conflicts += 1
        console.warn(
          `Konflikt: filename=${filename} existiert im Ziel mit id=${filenameConflict.id}, Quelle hat id=${sourceRow.id}.`,
        )
        continue
      }

      let blobStatus: Awaited<ReturnType<typeof copyBlob>> = 'skipped'
      if (!args.dbOnly && sourceBlobToken && targetBlobToken) {
        blobStatus = await copyBlob(sourceRow)
        if (blobStatus === 'copied') copiedBlobs += 1
        if (blobStatus === 'exists') existingBlobs += 1
        if (blobStatus === 'missing') {
          missingBlobs += 1
          console.warn(`Blob fehlt in Quelle: ${pathname ?? '(kein filename/url)'}`)
          if (!args.allowMissingBlobs) continue
        }
      }

      if (args.blobsOnly) continue

      const targetReadyRow = rowForTarget(sourceRow, targetBaseUrl)
      if (!targetRow) {
        insertedRows += 1
        console.info(`Insert media id=${sourceRow.id} filename=${filename ?? '(ohne filename)'}`)
        if (args.apply) await insertRow(targetClient, columns, targetReadyRow)
        continue
      }

      if (!rowsDiffer(columns, targetReadyRow, targetRow)) {
        skippedRows += 1
        continue
      }

      if (!args.overwriteExisting) {
        skippedRows += 1
        console.info(`Skip existing media id=${sourceRow.id}; nutze --overwrite-existing zum Aktualisieren.`)
        continue
      }

      updatedRows += 1
      console.info(`Update media id=${sourceRow.id} filename=${filename ?? '(ohne filename)'}`)
      if (args.apply) await updateRow(targetClient, columns, targetReadyRow)
    }

    if (args.apply && !args.blobsOnly) {
      await resetMediaSequence(targetClient)
    }

    console.info(
      [
        `Fertig (${args.apply ? 'angewendet' : 'dry-run'}).`,
        `DB inserts=${insertedRows}`,
        `updates=${updatedRows}`,
        `skipped=${skippedRows}`,
        `conflicts=${conflicts}`,
        `blobs copied=${copiedBlobs}`,
        `blobs existing=${existingBlobs}`,
        `blobs missing=${missingBlobs}`,
      ].join(' '),
    )
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()])
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
