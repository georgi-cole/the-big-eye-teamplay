import { useState } from 'react'
import { getAll } from '../data/houseguests'
import { useI18n } from '../i18n'
import { resolveAvatar } from '../utils/avatar'

const cast = getAll().map((player) => ({
  ...player,
  portrait: resolveAvatar({ ...player, avatar: player.avatar ?? '' }),
}))

export default function TeamplayCastPicker({
  id,
  onPick,
  disabled,
}: {
  id: string
  onPick: (id: string) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const contestant = cast.find((entry) => entry.id === id) ?? cast[0]
  const search = query.trim().toLocaleLowerCase()
  const matches = cast.filter((entry) =>
    `${entry.name} ${entry.fullName}`.toLocaleLowerCase().includes(search)
  )
  return (
    <>
      <div className="tp-cast-feature">
        <img src={contestant.portrait} alt="" />
        <div>
          <strong>{contestant.name}</strong>
          <p>{contestant.profession}</p>
          <p>{contestant.location}</p>
        </div>
      </div>
      <label className="tp-cast-search">
        <span className="tp-visually-hidden">{t('teamplay.castSearch')}</span>
        <input
          type="search"
          value={query}
          placeholder={t('teamplay.castSearch')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="tp-cast-pool" aria-label={t('teamplay.chooseContestant')} role="group">
        {!matches.length && <p>{t('teamplay.castEmpty')}</p>}
        {matches.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="tp-cast-option"
            aria-pressed={contestant.id === entry.id}
            disabled={disabled}
            onClick={() => onPick(entry.id)}
          >
            <img src={entry.portrait} alt="" loading="lazy" />
            <span>{entry.name}</span>
          </button>
        ))}
      </div>
    </>
  )
}
