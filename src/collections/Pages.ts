import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Seite',
    plural: 'Seiten',
  },
  admin: {
    useAsTitle: 'titel',
    defaultColumns: ['titel', 'slug', '_status', 'updatedAt'],
    description: 'Statische Seiten der Website (Home, Das Duo, Live, Impressum, Datenschutz …).',
  },
  // Veröffentlichte Seiten sind öffentlich lesbar; Entwürfe nur für eingeloggte Redakteure.
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  // Draft/Publish: Seiten lassen sich bearbeiten, ohne sie sofort live zu schalten.
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'titel',
      label: 'Titel',
      type: 'text',
      required: true,
      index: true,
    },
    slugField('titel'),
    {
      name: 'inhalt',
      label: 'Inhalt',
      type: 'richText',
      admin: {
        description: 'Der Seiteninhalt.',
      },
    },
  ],
  timestamps: true,
}
