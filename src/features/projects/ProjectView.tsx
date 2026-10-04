import { Columns3, List, PencilLine, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { ICON, button, cls } from '../../components/styles'
import { ProjectDot } from '../../components/ui'
import { useProject, useTasks } from '../../db/hooks'
import { BoardView } from '../board/BoardView'
import { ListView } from '../list/ListView'
import { ProjectDialog } from './ProjectDialog'

export function ProjectView() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const view = params.get('view') === 'list' ? 'list' : 'board'

  // undefined while loading, null once we know the project doesn't exist.
  if (project === undefined) return null
  if (!project) return <Navigate to="/today" replace />

  const open = tasks.filter((t) => t.status !== 'done').length
  const done = tasks.length - open

  const tab = (v: 'board' | 'list', label: string, Icon: LucideIcon) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => setParams(v === 'board' ? {} : { view: v }, { replace: true })}
      className={cls(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors',
        view === v ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
      )}
    >
      <Icon {...ICON} size={15} />
      {label}
    </button>
  )

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <ProjectDot color={project.color} className="h-3 w-3" />
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{project.name}</h1>
            <button type="button" className={button.icon} onClick={() => setEditing(true)} aria-label="Edit project" title="Edit project">
              <PencilLine {...ICON} />
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="font-medium">{project.key}</span> · {open} open · {done} done
            {project.archived && ' · Archived'}
          </p>
        </div>
        <div role="tablist" aria-label="View" className="flex rounded-lg border border-line bg-subtle p-0.5">
          {tab('board', 'Board', Columns3)}
          {tab('list', 'List', List)}
        </div>
      </div>
      {view === 'board' ? <BoardView project={project} tasks={tasks} /> : <ListView project={project} tasks={tasks} />}
      <ProjectDialog open={editing} onClose={() => setEditing(false)} project={project} onDeleted={() => navigate('/today')} />
    </div>
  )
}
