import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n'
import { SoundManager } from '../services/sound/SoundManager'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setAudio } from '../store/settingsSlice'
import { BUG_REPORT_EMAIL } from '../utils/openBugReport'
import TeamplayCastPicker from './TeamplayCastPicker'
import { TeamplayIcon, TeamplayIntroHero, TeamplayRules } from './TeamplayPresentation'
import './teamplay.css'

export default function TeamplayIntroHub() {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { musicOn, sfxOn } = useAppSelector((state) => state.settings.audio)
  const [screen, setScreen] = useState<'menu' | 'rules' | 'cast'>('menu')
  const [castId, setCastId] = useState('finn')
  const dialog = useRef<HTMLDialogElement>(null)
  const [utility, setUtility] = useState<'store' | 'report'>('store')
  const feedback = `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(t('teamplay.report.subject'))}&body=${encodeURIComponent(t('teamplay.report.body'))}`

  function navigate(next: typeof screen) {
    void SoundManager.play('ui:navigate')
    setScreen(next)
  }

  function showUtility(next: typeof utility) {
    void SoundManager.play('ui:navigate')
    setUtility(next)
    dialog.current?.showModal()
  }

  return (
    <main className="teamplay-screen tp-intro" data-view={screen}>
      <div className="tp-device">
        {screen === 'menu' ? (
          <div className="tp-lobby">
            {import.meta.env.VITE_TEAMPLAY_REVIEW !== 'true' && (
              <Link className="tp-lobby-return" to="/">
                <span className="tp-chevron" aria-hidden="true" /> {t('teamplay.home')}
              </Link>
            )}
            <TeamplayIntroHero />
            <div className="tp-lobby-actions">
              <Link
                className="tp-primary"
                to="/teamplay"
                onClick={() => void SoundManager.play('ui:confirm')}
              >
                <TeamplayIcon name="play" /> {t('teamplay.play')}
                <span className="tp-chevron" aria-hidden="true" />
              </Link>
              <nav aria-label={t('teamplay.mode')}>
                <button type="button" className="tp-menu-item" onClick={() => navigate('cast')}>
                  <TeamplayIcon name="tribes" /> {t('teamplay.castGallery')}
                </button>
                <button type="button" className="tp-menu-item" onClick={() => navigate('rules')}>
                  <TeamplayIcon name="rules" /> {t('teamplay.rules')}
                </button>
              </nav>
              <div className="tp-lobby-utilities" role="group" aria-label={t('teamplay.utilities')}>
                <button type="button" aria-haspopup="dialog" onClick={() => showUtility('store')}>
                  <TeamplayIcon name="store" />
                  {t('teamplay.store')}
                </button>
                <button
                  type="button"
                  aria-pressed={musicOn}
                  onClick={() => dispatch(setAudio({ musicOn: !musicOn }))}
                >
                  <TeamplayIcon name="music" />
                  {t('teamplay.music')}
                </button>
                <button
                  type="button"
                  aria-pressed={sfxOn}
                  onClick={() => {
                    dispatch(setAudio({ sfxOn: !sfxOn }))
                    if (!sfxOn) void SoundManager.play('ui:navigate')
                  }}
                >
                  <TeamplayIcon name="sound" />
                  {t('teamplay.sound')}
                </button>
                <button type="button" aria-haspopup="dialog" onClick={() => showUtility('report')}>
                  <TeamplayIcon name="report" />
                  {t('teamplay.report')}
                </button>
              </div>
            </div>
            <dialog
              className="tp-utility-dialog"
              data-utility={utility}
              ref={dialog}
              aria-labelledby="tp-utility-title"
            >
              <div className="tp-utility-heading">
                <TeamplayIcon name={utility} />
                <h2 id="tp-utility-title">{t(`teamplay.${utility}`)}</h2>
                <button
                  type="button"
                  className="tp-icon-button tp-dialog-close"
                  onClick={() => dialog.current?.close()}
                  aria-label={t('teamplay.close')}
                >
                  <TeamplayIcon name="close" />
                </button>
              </div>
              {utility === 'store' ? (
                <p>{t('teamplay.store.closed')}</p>
              ) : (
                <>
                  <p>{t('teamplay.report.help')}</p>
                  <a className="tp-primary" href={feedback}>
                    {t('teamplay.report.email')}
                  </a>
                </>
              )}
            </dialog>
          </div>
        ) : (
          <section className="tp-lobby-module tp-viewport" key={screen}>
            <button type="button" className="tp-quiet tp-back" onClick={() => navigate('menu')}>
              <span className="tp-chevron" aria-hidden="true" /> {t('teamplay.home')}
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
