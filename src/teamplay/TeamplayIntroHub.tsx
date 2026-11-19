import { useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n'
import { TeamplayIcon, TeamplayIntroHero, TeamplayRules } from './TeamplayPresentation'
import TeamplayCastPicker from './TeamplayCastPicker'
import './teamplay.css'

export default function TeamplayIntroHub() {
  const { t } = useI18n()
  const [screen, setScreen] = useState<'menu' | 'rules' | 'cast'>('menu')
  const [castId, setCastId] = useState('finn')
  return (
    <main className="teamplay-screen tp-intro" data-view={screen}>
      <div className="tp-device">
        {screen === 'menu' ? (
          <div className="tp-lobby">
            {import.meta.env.VITE_TEAMPLAY_REVIEW !== 'true' && (
              <Link className="tp-lobby-return" to="/">
                <span aria-hidden="true">‹</span> {t('teamplay.home')}
              </Link>
            )}
            <TeamplayIntroHero />
            <div className="tp-lobby-actions">
              <Link className="tp-primary" to="/teamplay">
                <TeamplayIcon name="play" /> {t('teamplay.play')} <span aria-hidden="true">›</span>
              </Link>
              <nav aria-label={t('teamplay.mode')}>
                <button type="button" className="tp-menu-item" onClick={() => setScreen('cast')}>
                  <TeamplayIcon name="tribes" /> {t('teamplay.castGallery')}
                </button>
                <button type="button" className="tp-menu-item" onClick={() => setScreen('rules')}>
                  <TeamplayIcon name="rules" /> {t('teamplay.rules')}
                </button>
              </nav>
            </div>
          </div>
        ) : (
          <section className="tp-lobby-module tp-viewport" key={screen}>
            <button type="button" className="tp-quiet tp-back" onClick={() => setScreen('menu')}>
              <span aria-hidden="true">‹</span> {t('teamplay.home')}
            </button>
            <h2>{t(screen === 'cast' ? 'teamplay.castGallery' : 'teamplay.rules')}</h2>
            {screen === 'cast' ? (
              <TeamplayCastPicker id={castId} onPick={setCastId} />
            ) : (
              <TeamplayRules />
            )}
          </section>
        )}
      </div>
    </main>
  )
}
