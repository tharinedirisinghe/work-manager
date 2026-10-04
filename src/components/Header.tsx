import { Keyboard, Menu, Moon, Plus, Search, Square, Sun } from 'lucide-react'
import { taskKey, useProject, useRunningEntry, useTask } from '../db/hooks'
import { setSetting, useSetting } from '../db/repo/settings'
import { stopTimer } from '../db/repo/time'
import { useNow } from '../hooks/useNow'
import { formatClock } from '../lib/time'
import { useUI } from '../store/ui'
import { ICON, button, cls } from './styles'
import { Kbd } from './ui'

function RunningTimer() {
  const entry = useRunningEntry()
  const task = useTask(entry?.taskId ?? null)
  const project = useProject(task?.projectId)
  const now = useNow(!!entry)
  const openTask = useUI((s) => s.openTask)
  if (!entry || !task) return null
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-accent/30 bg-accent-soft pr-1 pl-3 text-sm text-accent-ink">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <button type="button" className="min-w-0 truncate text-left hover:underline" onClick={() => openTask(task.id)} title={task.title}>
        <span className="hidden font-medium sm:inline">{taskKey(project, task.number)}</span>
        <span className="hidden md:inline"> · {task.title}</span>
      </button>
      <span className="font-medium tabular-nums">{formatClock(now - entry.start)}</span>
      <button
        type="button"
        onClick={stopTimer}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent hover:bg-accent-hover"
        aria-label="Stop timer"
        title="Stop timer"
      >
        <Square size={10} strokeWidth={2} fill="currentColor" />
      </button>
    </div>
  )
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const setHelpOpen = useUI((s) => s.setHelpOpen)
  const theme = useSetting('theme')
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
      <button type="button" className={cls(button.icon, 'lg:hidden')} onClick={onMenu} aria-label="Open menu" title="Menu">
        <Menu {...ICON} size={18} />
      </button>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search or add"
        className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-faint transition-colors hover:border-line-strong sm:w-full sm:max-w-xs sm:shrink"
      >
        <Search {...ICON} />
        <span className="hidden flex-1 text-left sm:inline">Search or add…</span>
        <span className="hidden gap-0.5 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex min-w-0 items-center gap-1.5">
        <RunningTimer />
        <button type="button" className={button.primary} onClick={() => setPaletteOpen(true)} title="New task (N)">
          <Plus {...ICON} strokeWidth={2} />
          <span className="hidden sm:inline">New task</span>
        </button>
        <button type="button" className={cls(button.icon, 'max-sm:hidden')} onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          <Keyboard {...ICON} />
        </button>
        <button
          type="button"
          className={button.icon}
          onClick={() => setSetting('theme', isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Light theme' : 'Dark theme'}
        >
          {isDark ? <Sun {...ICON} /> : <Moon {...ICON} />}
        </button>
      </div>
    </header>
  )
}
