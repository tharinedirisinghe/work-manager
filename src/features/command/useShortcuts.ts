import { useEffect } from 'react'
import { updateTask } from '../../db/repo/tasks'
import { STATUSES } from '../../db/types'
import { useUI } from '../../store/ui'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Global keyboard shortcuts. Single-key shortcuts are ignored while typing. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.setPaletteOpen(!ui.paletteOpen)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || ui.paletteOpen) return

      if (e.key === 'n') {
        e.preventDefault()
        ui.setPaletteOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        const search = document.getElementById('list-search')
        if (search) search.focus()
        else ui.setPaletteOpen(true)
      } else if (e.key === '?') {
        ui.setHelpOpen(true)
      } else if (ui.openTaskId && ['1', '2', '3', '4'].includes(e.key)) {
        updateTask(ui.openTaskId, { status: STATUSES[Number(e.key) - 1].id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export const SHORTCUTS: [string[], string][] = [
  [['Ctrl', 'K'], 'Search or add a task'],
  [['N'], 'New task'],
  [['/'], 'Search in list view'],
  [['1', '2', '3', '4'], 'Set status of the open task'],
  [['Esc'], 'Close a panel or dialog'],
  [['?'], 'Show keyboard shortcuts'],
]
