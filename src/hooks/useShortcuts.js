import { useEffect, useMemo } from 'react'
import { SHORTCUTS } from '../config/shortcuts'

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const parseCombo = (combo) => {
  const parts = combo.split('+').map((part) => part.trim().toLowerCase())
  const key = parts.pop()
  if (!key) {
    return null
  }
  return {
    key,
    ctrlKey: parts.includes('ctrl'),
    metaKey: parts.includes('meta') || parts.includes('cmd'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
  }
}

const PARSED_SHORTCUTS = Object.entries(SHORTCUTS)
  .map(([id, config]) => ({
    id,
    config: parseCombo(config.combo),
  }))
  .filter((s) => s.config)

function matchesShortcut(event, shortcutConfig) {
  if (!shortcutConfig) return false
  const keyMatch = shortcutConfig.key.toLowerCase() === event.key.toLowerCase()
  const ctrlMatch = shortcutConfig.ctrlKey === event.ctrlKey
  const metaMatch = shortcutConfig.metaKey === event.metaKey
  const shiftMatch = shortcutConfig.shiftKey === event.shiftKey
  const altMatch = shortcutConfig.altKey === event.altKey
  return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch
}

function useShortcuts(handlers) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return
      const tagName = event.target?.tagName
      if (tagName && INPUT_TAGS.has(tagName)) return

      const matchedShortcut = PARSED_SHORTCUTS.find((shortcut) =>
        matchesShortcut(event, shortcut.config)
      )

      if (!matchedShortcut) return

      const handler = handlers[matchedShortcut.id]
      if (typeof handler === 'function') {
        event.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlers])
}

export default useShortcuts
