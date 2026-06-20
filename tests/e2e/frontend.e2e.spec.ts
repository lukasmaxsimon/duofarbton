import { test, expect } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config.js'

const fixtureProgramme = [
  {
    titel: 'E2E Klangbilder',
    kartenUntertitel: 'Fixture Programm 1',
    slug: 'e2e-klangbilder',
    position: 1,
  },
  {
    titel: 'E2E Farbton',
    kartenUntertitel: 'Fixture Programm 2',
    slug: 'e2e-farbton',
    position: 2,
  },
]

let payload: Payload

test.beforeAll(async () => {
  payload = await getPayload({ config })

  for (const programm of fixtureProgramme) {
    await payload.delete({
      collection: 'programme',
      where: { slug: { equals: programm.slug } },
    })

    await payload.create({
      collection: 'programme',
      data: programm,
    })
  }
})

test.afterAll(async () => {
  if (!payload) return

  for (const programm of fixtureProgramme) {
    await payload.delete({
      collection: 'programme',
      where: { slug: { equals: programm.slug } },
    })
  }
})

test.describe('Startseite', () => {
  test('lädt mit korrektem Titel und Hero', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Duo Farbton/)

    // Hero-Bild-Ebene und Logo (Inline-SVG mit 10 Buchstaben).
    await expect(page.locator('.home-hero__bild')).toBeVisible()
    const logo = page.locator('svg.home-hero__logo')
    await expect(logo).toHaveAttribute('aria-label', 'Duo Farbton')
    await expect(logo.locator('path.ltr')).toHaveCount(10)
  })

  test('Programme-Carousel: zwei Panels, erstes standardmäßig offen', async ({ page }) => {
    await page.goto('/')

    // Carousel zeigt genau so viele Panels wie es Programme gibt (datengetrieben).
    const res = await page.request.get('/api/programme?limit=100&depth=0')
    const { totalDocs } = await res.json()
    expect(totalDocs).toBeGreaterThanOrEqual(2)

    const panels = page.locator('.pc-panel')
    await expect(panels).toHaveCount(totalDocs)

    // Standard: erstes Panel aktiv.
    await expect(panels.nth(0)).toHaveClass(/is-active/)
    await expect(panels.nth(1)).not.toHaveClass(/is-active/)

    // Jedes Panel hat einen „Mehr erfahren"-Button (öffnet das Sheet).
    await expect(panels.nth(0).getByRole('button', { name: 'Mehr erfahren' })).toHaveCount(1)
  })

  test('Carousel reagiert auf Hover: zweites Panel öffnet, Meta wird sichtbar', async ({
    page,
  }) => {
    await page.goto('/')

    const panels = page.locator('.pc-panel')
    const zweites = panels.nth(1)

    await zweites.hover()

    await expect(zweites).toHaveClass(/is-active/)
    await expect(panels.nth(0)).not.toHaveClass(/is-active/)

    // Meta-Block des geöffneten Panels blendet ein (Transition ~0,6 s) → poll.
    const meta = zweites.locator('.pc-panel__meta')
    await expect
      .poll(() => meta.evaluate((el) => parseFloat(getComputedStyle(el).opacity)), {
        timeout: 2000,
      })
      .toBeGreaterThan(0.9)

    // CTA „Mehr erfahren" ist vorhanden.
    await expect(zweites.getByText('Mehr erfahren')).toBeVisible()
  })

  test('Aktive Karte bleibt aktiv, wenn die Maus das Carousel verlässt', async ({ page }) => {
    await page.goto('/')

    const panels = page.locator('.pc-panel')
    const zweites = panels.nth(1)

    await zweites.hover()
    await expect(zweites).toHaveClass(/is-active/)

    // Maus weit weg bewegen (raus aus dem Carousel).
    await page.mouse.move(5, 5)

    // Zweite Karte bleibt aktiv, springt nicht zurück auf die erste.
    await expect(zweites).toHaveClass(/is-active/)
    await expect(panels.nth(0)).not.toHaveClass(/is-active/)
  })

  test('Button öffnet Bottom-Sheet mit Programm-Infos und schließt wieder', async ({ page }) => {
    await page.goto('/')

    // CTA des (standardmäßig offenen) ersten Panels klicken.
    await page.locator('.pc-panel').first().getByRole('button', { name: 'Mehr erfahren' }).click()

    // Sheet öffnet sich (Dialog sichtbar, eingefahren).
    const sheet = page.locator('.pm__sheet')
    await expect(sheet).toBeVisible()
    await expect(page.locator('.pm.is-open')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Eingefahren: transform translateY(0) (matrix ohne Y-Versatz).
    await expect
      .poll(() => sheet.evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/matrix\(1, 0, 0, 1, 0, 0\)|none/)

    // Schließen.
    await page.locator('.pm__close').click()
    await expect(page.locator('.pm.is-open')).toHaveCount(0)
  })

  test('Bei offenem Sheet bleibt die zuletzt aktive Karte aktiv', async ({ page }) => {
    await page.goto('/')

    const panels = page.locator('.pc-panel')
    const zweites = panels.nth(1)

    // Zweites Panel aktivieren und dessen Button klicken.
    await zweites.hover()
    await expect(zweites).toHaveClass(/is-active/)
    await zweites.getByRole('button', { name: 'Mehr erfahren' }).click()

    // Sheet offen — und die zweite Karte bleibt aktiv (springt nicht auf #1).
    await expect(page.locator('.pm.is-open')).toBeVisible()
    await expect(zweites).toHaveClass(/is-active/)
    await expect(panels.nth(0)).not.toHaveClass(/is-active/)
  })

  test('Hero-Phasen: zuerst nur Logo, weiße Fläche/Zoom erst verzögert', async ({ page }) => {
    await page.goto('/')

    const vars = () =>
      page.evaluate(() => {
        const s = getComputedStyle(document.documentElement)
        return {
          fade: parseFloat(s.getPropertyValue('--scroll-fade') || '0'),
          rest: parseFloat(s.getPropertyValue('--scroll-rest') || '0'),
        }
      })

    // Kleiner Scroll (unter der Schwelle REST_START = 0.15): Logo läuft, Rest 0.
    await page.mouse.wheel(0, await page.evaluate(() => window.innerHeight * 0.1))
    await expect.poll(async () => (await vars()).fade, { timeout: 4000 }).toBeGreaterThan(0.05)
    expect((await vars()).rest).toBe(0)

    // Voll scrollen: jetzt läuft auch der Rest (weiße Fläche/Zoom).
    await page.mouse.wheel(0, await page.evaluate(() => window.innerHeight))
    await expect.poll(async () => (await vars()).rest, { timeout: 4000 }).toBeGreaterThan(0.3)
  })

  test('Nächste Section tritt bei ~70vh ein (während der Hero-Animation)', async ({ page }) => {
    await page.goto('/')

    const sectionTop = () =>
      page.evaluate(
        () => document.querySelector('.home-programme')!.getBoundingClientRect().top,
      )
    const vh = await page.evaluate(() => window.innerHeight)

    // Vor ~70vh (hier 60vh gescrollt): Section noch unterhalb des Sichtfelds.
    await page.mouse.wheel(0, vh * 0.6)
    await expect.poll(sectionTop, { timeout: 4000 }).toBeGreaterThan(vh)

    // Ab ~70vh (hier 80vh gescrollt): Section ist eingetreten (sichtbar) — also
    // schon während der Hero-Animation (die erst bei 100vh fertig ist).
    await page.mouse.wheel(0, vh * 0.2)
    await expect.poll(sectionTop, { timeout: 4000 }).toBeLessThan(vh)
  })

  test('Scroll-Fade: --scroll-fade steigt beim Scrollen', async ({ page }) => {
    await page.goto('/')

    const start = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-fade') || '0'),
    )
    expect(start).toBeLessThan(0.05)

    // Eine Viewport-Höhe scrollen (über Wheel, damit Lenis es verarbeitet).
    await page.mouse.wheel(0, await page.evaluate(() => window.innerHeight))
    // Auf das trägheitsbehaftete Nachziehen (scrub + Lenis) warten.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--scroll-fade') || '0',
            ),
          ),
        { timeout: 4000 },
      )
      .toBeGreaterThan(0.3)
  })
})
