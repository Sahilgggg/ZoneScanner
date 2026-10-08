import { useSyncExternalStore } from 'react'

// Light / dark theme stored on <html data-theme="…">. index.html sets the
// initial value before first paint (saved choice, else the system setting).

const KEY = 'zs.theme'
const META_COLORS = { light: '#f3efe6', dark: '#161513' }
const listeners = new Set()

function current() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable: the theme still applies for this visit
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Returns [theme, toggleTheme].
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, () => 'light')
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}
