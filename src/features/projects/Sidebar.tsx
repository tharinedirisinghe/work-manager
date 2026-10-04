import { Archive, ChartNoAxesColumn, ChevronDown, ChevronRight, Plus, Settings, SunMedium, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { Logo } from '../../components/Logo'
import { NAV_ICON, cls } from '../../components/styles'
import { ProjectDot } from '../../components/ui'
import { useProjects, useTasks } from '../../db/hooks'
import { ProjectDialog } from './ProjectDialog'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cls(
    'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
    isActive ? 'bg-surface font-medium text-ink shadow-card ring-1 ring-line' : 'text-ink-muted hover:bg-subtle hover:text-ink',
  )

function NavItem({ to, icon: Icon, children }: { to: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <NavLink to={to} className={linkClass}>
      {({ isActive }) => (
        <>
          <Icon {...NAV_ICON} className={isActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted'} />
          {children}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const projects = useProjects()
  const tasks = useTasks()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const openCount = (id: string) => tasks.filter((t) => t.projectId === id && t.status !== 'done').length
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)

  return (
    <nav className="flex h-full flex-col gap-0.5 px-3 py-4" onClick={(e) => (e.target as HTMLElement).closest('a') && onNavigate?.()}>
      <div className="mb-5 px-2.5">
        <Logo />
      </div>
      <NavItem to="/today" icon={SunMedium}>
        Today
      </NavItem>
      <NavItem to="/review" icon={ChartNoAxesColumn}>
        Weekly review
      </NavItem>

      <div className="mt-6 mb-1 flex items-center justify-between pr-1 pl-2.5">
        <span className="text-xs font-medium text-ink-muted">Projects</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-subtle hover:text-ink"
          aria-label="New project"
          title="New project"
        >
          <Plus size={15} strokeWidth={NAV_ICON.strokeWidth} />
        </button>
      </div>
      {active.length === 0 && (
        <button type="button" onClick={() => setCreating(true)} className="mx-2.5 mt-1 text-left text-sm text-accent-ink hover:underline">
          Create your first project
        </button>
      )}
      {active.map((p) => (
        <NavLink key={p.id} to={`/p/${p.id}`} className={linkClass}>
          <span className="flex w-[18px] justify-center">
            <ProjectDot color={p.color} className="h-2.5 w-2.5" />
          </span>
          <span className="flex-1 truncate">{p.name}</span>
          <span className="text-xs tabular-nums text-ink-faint">{openCount(p.id) || ''}</span>
        </NavLink>
      ))}
      {archived.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="mt-1 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-left text-xs text-ink-muted hover:bg-subtle"
          >
            {showArchived ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Archive size={14} strokeWidth={NAV_ICON.strokeWidth} />
            Archived ({archived.length})
          </button>
          {showArchived &&
            archived.map((p) => (
              <NavLink key={p.id} to={`/p/${p.id}`} className={(s) => cls(linkClass(s), 'opacity-70')}>
                <span className="flex w-[18px] justify-center">
                  <ProjectDot color={p.color} className="h-2.5 w-2.5" />
                </span>
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
        </>
      )}

      <div className="mt-auto pt-4">
        <NavItem to="/settings" icon={Settings}>
          Settings
        </NavItem>
      </div>

      <ProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          navigate(`/p/${id}`)
          onNavigate?.()
        }}
      />
    </nav>
  )
}
