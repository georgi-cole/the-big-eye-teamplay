const HOME_HUB_SPLASH_LAST_GAME_KEY = 'the-big-eye-teamplay:homeHubSplashLastGameId'
const HOME_HUB_SPLASH_SESSION_KEY = 'the-big-eye-teamplay:homeHubSplashShownThisSession'

export function hasShownHomeHubSplashThisSession(): boolean {
  try {
    return sessionStorage.getItem(HOME_HUB_SPLASH_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function hasSeenHomeHubSplashForGame(gameId: string): boolean {
  try {
    return localStorage.getItem(HOME_HUB_SPLASH_LAST_GAME_KEY) === gameId
  } catch {
    return false
  }
}

export function markHomeHubSplashSeenForGame(gameId: string): void {
  try {
    localStorage.setItem(HOME_HUB_SPLASH_LAST_GAME_KEY, gameId)
  } catch {
    // Ignore storage failures; the splash will replay next mount instead.
  }

  try {
    sessionStorage.setItem(HOME_HUB_SPLASH_SESSION_KEY, 'true')
  } catch {
    // Ignore storage failures; the next splash will use the launch duration.
  }
}
