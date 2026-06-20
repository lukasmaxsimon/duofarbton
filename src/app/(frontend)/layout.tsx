import React from 'react'

import { SmoothScroll } from './components/SmoothScroll'
import './styles.css'

export const metadata = {
  description: 'Duo Farbton – Klavier und Marimba/Schlagwerk. Kammermusik neu erlebt.',
  title: 'Duo Farbton',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="de">
      <body>
        {/* Globales Smooth-Scroll (Lenis). */}
        <SmoothScroll />
        <main>{children}</main>
      </body>
    </html>
  )
}
