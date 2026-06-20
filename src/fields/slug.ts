import type { Field } from 'payload'

/** Wandelt einen Titel in einen URL-tauglichen Slug (für Frontend-Routen). */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Wiederverwendbares Slug-Feld: liegt in der Sidebar und wird beim Speichern
 * automatisch aus dem angegebenen Quellfeld (Default: `titel`) erzeugt, sofern
 * leer. Ein manuell gesetzter Slug wird ebenfalls normalisiert.
 */
export const slugField = (quelle = 'titel'): Field => ({
  name: 'slug',
  label: 'Slug (URL)',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Wird automatisch aus dem Titel erzeugt, falls leer.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (value) return slugify(value as string)
        const quellwert = (data as Record<string, unknown> | undefined)?.[quelle]
        if (typeof quellwert === 'string' && quellwert) return slugify(quellwert)
        return value
      },
    ],
  },
})
