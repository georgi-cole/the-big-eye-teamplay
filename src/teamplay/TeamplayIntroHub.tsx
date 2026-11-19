import { Link } from 'react-router'
import { useI18n } from '../i18n'
import { TeamplayIntroHero, TeamplayRules } from './TeamplayPresentation'
import './teamplay.css'

export default function TeamplayIntroHub() {
  const { t } = useI18n()
  return (
    <main className="teamplay-screen teamplay-hub">
      <div className="teamplay-scroll">
        <section className="teamplay-intro">
          <TeamplayIntroHero />
          <div className="teamplay-intro-setup">
            <Link className="teamplay-play-link" to="/teamplay">
              {t('teamplay.play')} <span aria-hidden="true">→</span>
            </Link>
            <TeamplayRules />
          </div>
        </section>
      </div>
    </main>
  )
}
