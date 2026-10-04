import { ChartNoAxesColumn, FolderSync, X } from 'lucide-react'
import { useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router'
import { ConfirmHost } from './components/ConfirmDialog'
import { Header } from './components/Header'
import { ICON, cls } from './components/styles'
import { Kbd, Modal } from './components/ui'
import { CommandPalette } from './features/command/CommandPalette'
import { SHORTCUTS, useShortcuts } from './features/command/useShortcuts'
import { ProjectView } from './features/projects/ProjectView'
import { Sidebar } from './features/projects/Sidebar'
import { WeeklyReview } from './features/review/WeeklyReview'
import { SettingsView } from './features/settings/SettingsView'
import { TaskDrawer } from './features/task/TaskDrawer'
import { TodayView } from './features/today/TodayView'
import { useAppBoot } from './hooks/useAppBoot'
import { regrantBackupPermission } from './lib/backup'
import { useUI } from './store/ui'

function Banners() {
  const newReviewWeek = useUI((s) => s.newReviewWeek)
  const setNewReviewWeek = useUI((s) => s.setNewReviewWeek)
  const needsPermission = useUI((s) => s.backupNeedsPermission)
  const setNeedsPermission = useUI((s) => s.setBackupNeedsPermission)
  const banner = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6'

  return (
    <>
      {newReviewWeek && (
        <div className={cls(banner, 'border-accent/20 bg-accent-soft text-accent-ink')}>
          <ChartNoAxesColumn {...ICON} />
          <span className="flex-1">Your review for last week is ready.</span>
          <Link to={`/review?week=${newReviewWeek}`} onClick={() => setNewReviewWeek(null)} className="font-medium underline underline-offset-2">
            Open review
          </Link>
          <button type="button" onClick={() => setNewReviewWeek(null)} aria-label="Dismiss" title="Dismiss" className="opacity-70 hover:opacity-100">
            <X {...ICON} />
          </button>
        </div>
      )}
      {needsPermission && (
        <div className={cls(banner, 'border-warning/20 bg-warning-soft text-warning')}>
          <FolderSync {...ICON} />
          <span className="flex-1">The browser needs your permission to keep saving daily backups to your folder.</span>
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={async () => setNeedsPermission(!(await regrantBackupPermission()))}
          >
            Allow backups
          </button>
        </div>
      )}
    </>
  )
}

function ShortcutsHelp() {
  const open = useUI((s) => s.helpOpen)
  const setOpen = useUI((s) => s.setHelpOpen)
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <dl className="divide-y divide-line text-sm">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys.join('+')} className="flex items-center justify-between gap-4 py-2.5">
            <dd className="text-ink-muted">{what}</dd>
            <dt className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dt>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

function Shell() {
  useAppBoot()
  useShortcuts()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-canvas lg:block">
        <Sidebar />
      </aside>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-canvas shadow-float">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Banners />
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayView />} />
            <Route path="/p/:projectId" element={<ProjectView />} />
            <Route path="/review" element={<WeeklyReview />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </main>
      </div>
      <TaskDrawer />
      <CommandPalette />
      <ShortcutsHelp />
      <ConfirmHost />
    </div>
  )
}

export default function App() {
  // Hash routing works on GitHub Pages without server-side rewrites.
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
