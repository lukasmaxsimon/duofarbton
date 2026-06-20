import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

/** Optionale URL-Validierung — leer erlaubt, sonst muss es eine http(s)-URL sein. */
const optionalUrl = (value: string | null | undefined): true | string => {
  if (!value) return true
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return true
    return 'Bitte eine vollständige URL mit http:// oder https:// angeben.'
  } catch {
    return 'Bitte eine gültige URL angeben (z. B. https://…).'
  }
}

export const Programme: CollectionConfig = {
  slug: 'programme',
  labels: {
    singular: 'Programm',
    plural: 'Programme',
  },
  admin: {
    useAsTitle: 'titel',
    defaultColumns: ['titel', 'position', 'kartenUntertitel', 'updatedAt'],
    description: 'Konzertprogramme des Duos — Reihenfolge im Slider über das Feld „Position".',
  },
  // Öffentlich lesbar (Frontend); Schreiben nur für eingeloggte Redakteure (Default).
  access: {
    read: () => true,
  },
  // Liste standardmäßig nach Slider-Position sortieren.
  defaultSort: 'position',
  fields: [
    {
      name: 'titel',
      label: 'Titel',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'kartenUntertitel',
      label: 'Untertitel (für die Card)',
      type: 'text',
      admin: {
        description: 'Kurzer Untertitel, der auf der Programm-Card unter dem Titel erscheint.',
      },
    },
    {
      name: 'bild',
      label: 'Bild',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'programminhalt',
      label: 'Programminhalt',
      type: 'richText',
      admin: {
        description: 'Das eigentliche Programm (Werke, Reihenfolge, Beschreibung).',
      },
    },
    {
      name: 'freitext',
      label: 'Freitext',
      type: 'textarea',
      admin: {
        description: 'Zusätzliche Freitextfläche (z. B. Anmerkungen, Besetzung, Dauer).',
      },
    },
    {
      name: 'trailerUrl',
      label: 'Trailer-URL',
      type: 'text',
      validate: optionalUrl,
      admin: {
        description: 'Link zum Trailer-Video (z. B. YouTube/Vimeo).',
      },
    },
    {
      name: 'programmPdfUrl',
      label: 'Programm-PDF-URL',
      type: 'text',
      validate: optionalUrl,
      admin: {
        description: 'Link zum Programm-PDF.',
      },
    },
    {
      name: 'position',
      label: 'Position im Slider',
      type: 'number',
      required: true,
      min: 1,
      index: true,
      admin: {
        position: 'sidebar',
        step: 1,
        description:
          'An welcher Stelle dieses Programm im Programm-Slider erscheint (1 = erste Position).',
      },
    },
    slugField('titel'),
  ],
  timestamps: true,
}
