import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

/** Startseiten der Website. Reihenfolge = Anlage-Reihenfolge. */
const seiten: { titel: string; slug: string }[] = [
  { titel: 'Home', slug: 'home' },
  { titel: 'Das Duo', slug: 'das-duo' },
  { titel: 'Live', slug: 'live' },
  { titel: 'Impressum', slug: 'impressum' },
  { titel: 'Datenschutz', slug: 'datenschutz' },
]

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  for (const seite of seiten) {
    const vorhanden = await payload.find({
      collection: 'pages',
      where: { slug: { equals: seite.slug } },
      limit: 1,
      depth: 0,
    })

    if (vorhanden.docs.length > 0) {
      payload.logger.info(`Seite „${seite.titel}" existiert bereits — übersprungen.`)
      continue
    }

    await payload.create({
      collection: 'pages',
      data: { titel: seite.titel, slug: seite.slug, _status: 'published' },
    })
    payload.logger.info(`Seite „${seite.titel}" angelegt.`)
  }

  payload.logger.info('Seed abgeschlossen.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
