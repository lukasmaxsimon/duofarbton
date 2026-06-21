import Image from 'next/image'
import React, { Fragment } from 'react'

import './das-duo.css'
import { Reveal } from './Reveal'

export const metadata = {
  title: 'Das Duo – Duo Farbton',
  description:
    'Duo Farbton – Elisaveta Ilina (Klavier) und Sönke Schreiber (Marimba/Schlagwerk). Neue Wege und Klänge in der Kammermusik.',
}

/**
 * Seite "Das Duo" – nachgebaut nach duofarbton.de/das-duo.
 *
 * Texte sind aktuell statisch im Code (später über das CMS pflegbar).
 * Bilder sind vorübergehend fest verdrahtet und werden später über das CMS
 * pflegbar.
 */
const duoImage = '/images/DuoFarbton_extend.jpg'

export default function DasDuoPage() {
  return (
    <Fragment>
      <div className="duo">
        {/* Ohne JS bleiben die Reveal-Inhalte sichtbar. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>

        {/* Hero / Header-Bild */}
        <section className="duo-hero">
          <Image alt="Duo Farbton" src={duoImage} fill priority sizes="100vw" />
          <Reveal>
            <h1>Das Duo</h1>
          </Reveal>
        </section>

        {/* Einleitung */}
        <section className="duo-intro">
          <Reveal>
            <p>
              Neue Wege und Klänge in der Kammermusik zu beschreiten – das war der Wunsch, der zur
              Gründung des Duos führte. Diese Instrumentenkombination von Marimba und Klavier ist
              faszinierend und einmalig. Die warmen, erdigen Klangwolken der Marimba harmonieren mit
              den klaren und präzisen Anschlägen des Klaviers wunderbar. Es entstehen vielfältige
              Farbnuancen und lassen das Gehörte neu empfinden: klangvolle Bilder, mitreißend,
              rhythmisch pulsierend, dann wieder schwebend und voller Leere.
            </p>
            <p>
              Die Pianistin Elisaveta Ilina und der Schlagwerker Sönke Schreiber setzen in diesem
              Ensemble ihre Vorstellungen von Klang und Farbe um. Klassische Werke, moderne Stücke,
              unbekannte Originalkompositionen, populäre Filmmusik – vielfältige Programme entstehen
              und werden zu Erlebnissen gebündelt.
            </p>
            <p>
              Die beiden Musiker arrangierten bekannte Werke wie den „Karneval der Tiere“ von Camille
              Saint-Saëns, den „Nussknacker“ von Peter Tschaikowsky oder die „Bilder einer
              Ausstellung“ von Modest Mussorgsky. So erklingen diese grandiosen Kompositionen nun auf
              eine neue Art frisch und lebendig.
            </p>
            <p>
              2016 ist ihre erste CD erschienen mit Mussorgsky’s „Bilder einer Ausstellung“ im
              Mittelpunkt. Das zweite Album ist für 2025 geplant.
            </p>
          </Reveal>
        </section>

        {/* Elisaveta Ilina – Klavier (Bild links) */}
        <section className="duo-person">
          <Reveal className="duo-person-media">
            <Image
              alt="Elisaveta Ilina"
              src={duoImage}
              width={1200}
              height={800}
              sizes="(max-width: 880px) 100vw, 440px"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <p className="eyebrow">Klavier</p>
            <h2>Elisaveta Ilina</h2>
            <p>
              Nach ihrem Abschluss mit Auszeichnung an der Musikfachschule „Mussorgsky“ in der Klasse
              von Tatjana Osipowa führte ihr musikalischer Werdegang die gebürtige Sankt
              Petersburgerin nach Hamburg. Dort trat sie mit Beethovens zweitem Klavierkonzert auf und
              lernte ihre zukünftige Lehrerin kennen. Im Jahr 2005 begann sie ihr Studium in der
              Klasse von Frau Professorin Johanna Wiedenbach an der Hochschule für Musik und Theater
              Hamburg. Zusätzlich belegte sie einen weiteren Studiengang, der sich mit Bewegung und
              Improvisation in der Musik auseinandersetzt.
            </p>
            <p>
              Anschließend setzte sie ihr Klavier-Masterstudium bei Professor Gerrit Zitterbart an der
              Hochschule für Musik, Theater und Medien Hannover fort.
            </p>
            <p>
              Weitere Anregungen und Inspirationen erlebte Elisaveta Ilina im Unterricht bei Anna
              Vinnitzkaya, Konrad Elser, Berndt Goetzke, Jacques Rouvier und Jean Fassina. Als
              Solistin trat sie mit Klavierkonzerten von Clara Schumann, Ludwig van Beethoven, Edward
              Grieg und Sergej Rachmaninow auf.
            </p>
            <p>
              Im Unterricht an der Staatlichen Jugendmusikschule Hamburg und als Dozentin am Hamburger
              Konservatorium vermittelt sie ihre musikalische Vorstellung den Schülern und
              Studierenden. Zudem leitet und moderiert sie die Konzertreihe „Musik im Dialog“ im
              Kunsthaus Salzwedel.
            </p>
            <p>
              Die russische Pianistin zeichnet sich als besonders ausdrucksstarke und natürliche
              Interpretin aus. Ihre Vielfalt an Klangfarben macht ihr Spiel zu einem besonderen
              musikalischen Erlebnis.
            </p>
          </Reveal>
        </section>

        {/* Sönke Schreiber – Marimba/Schlagwerk (Bild rechts) */}
        <section className="duo-person reverse">
          <Reveal className="duo-person-media">
            <Image
              alt="Sönke Schreiber"
              src={duoImage}
              width={1200}
              height={800}
              sizes="(max-width: 880px) 100vw, 440px"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <p className="eyebrow">Marimba / Schlagwerk</p>
            <h2>Sönke Schreiber</h2>
            <p>
              Sönke Schreiber studierte klassisches Schlagwerk an der Hochschule für Musik und Theater
              in Hamburg. Die Vielfalt der Instrumente und Klänge, das Körperliche am Spiel und die
              universelle Anwendbarkeit begeisterte ihn an diesem Instrumentenkosmos damals genauso
              wie heute.
            </p>
            <p>
              Neben dem Spiel im Duo Farbton musiziert er in weiteren, unterschiedlichen Formationen
              und Projekten, so z.B. im Musical „Der König der Löwen“ und bei den Philharmonikern
              Hamburg. Als Solist trat Sönke Schreiber mit Marimbakonzerten von Ney Rosauro, Emmanuel
              Séjourné, Darius Milhaud und Anders Koppel auf, zudem mit dem Paukenkonzert von Philip
              Glass.
            </p>
            <p>
              Bei Elbtonal Percussion, dem fulminanten Schlagzeugquartett aus Hamburg, ist er seit
              2012 Mitglied und tourt durch Deutschland und im Ausland. Seine Erfahrungen und
              Erkenntnisse gibt er im Unterricht an der Staatlichen Jugendmusikschule Hamburg an die
              Kinder und Jugendlichen weiter.
            </p>
          </Reveal>
        </section>

      </div>
    </Fragment>
  )
}
