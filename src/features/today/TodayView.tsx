import { format } from 'date-fns'
import { CalendarDays, ChevronDown, ChevronRight, Clock, Coffee, Plus, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ICON, button, cls } from '../../components/styles'
import { Checkbox, EmptyState, Kbd, PriorityIndicator, ProjectDot, TimerButton } from '../../components/ui'
import { taskKey, useMinutesByTask, useProjectMap, useTasks } from '../../db/hooks'
import { useSetting } from '../../db/repo/settings'
import { updateTask } from '../../db/repo/tasks'
import { priorityRank, type Task } from '../../db/types'
import { formatDue } from '../../lib/dates'
import { formatMinutes } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'
import { useUI } from '../../store/ui'

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function TodayView() {
  const tasks = useTasks()
  const projects = useProjectMap()
  const minutes = useMinutesByTask()
  const wipLimit = useSetting('wipLimit')
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const [showDone, setShowDone] = useState(false)
  const [now] = useState(() => new Date())
  const today = isoDate(now)
  const startOfToday = new Date(`${today}T00:00:00`).getTime()

  const sections = useMemo(() => {
    const live = tasks.filter((t) => !projects.get(t.projectId)?.archived)
    const open = live.filter((t) => t.status !== 'done')
    const byPriority = (a: Task, b: Task) => priorityRank(b.priority) - priorityRank(a.priority) || a.order - b.order
    const seen = new Set<string>()
    const take = (list: Task[]) => {
      const out = list.filter((t) => !seen.has(t.id)).sort(byPriority)
      out.forEach((t) => seen.add(t.id))
      return out
    }
    return {
      inProgress: take(open.filter((t) => t.status === 'in_progress')),
      overdue: take(open.filter((t) => t.dueDate && t.dueDate < today)),
      planned: take(open.filter((t) => t.plannedFor && t.plannedFor <= today)),
      dueToday: take(open.filter((t) => t.dueDate === today)),
      doneToday: live.filter((t) => t.status === 'done' && (t.completedAt ?? 0) >= startOfToday),
    }
  }, [tasks, projects, today, startOfToday])

  const focus = [...sections.inProgress, ...sections.overdue, ...sections.planned, ...sections.dueToday]
  const plannedMinutes = focus.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-sm text-ink-muted">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{greeting(now.getHours())}</h1>
        {focus.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Stat label="To focus on" value={String(focus.length)} />
            <Stat label="Estimated" value={plannedMinutes ? formatMinutes(plannedMinutes) : '—'} />
            <Stat label="Done today" value={String(sections.doneToday.length)} />
          </div>
        )}
      </header>

      {focus.length === 0 && (
        <EmptyState icon={Coffee} title="Nothing planned for today">
          <p>
            Open a task and choose <b className="font-medium text-ink">Plan for today</b>, or press <Kbd>N</Kbd> and add <code className="rounded bg-subtle px-1">@today</code>.
          </p>
          <button type="button" onClick={() => setPaletteOpen(true)} className={cls(button.secondary, 'mt-4')}>
            <Plus {...ICON} />
            Add a task for today
          </button>
        </EmptyState>
      )}

      <Group
        title="In progress"
        tasks={sections.inProgress}
        note={wipLimit > 0 && sections.inProgress.length > wipLimit ? `More than ${wipLimit} tasks in progress. Finish one before starting another.` : undefined}
        projects={projects}
        minutes={minutes}
      />
      <Group title="Overdue" tasks={sections.overdue} projects={projects} minutes={minutes} danger />
      <Group title="Planned for today" tasks={sections.planned} projects={projects} minutes={minutes} />
      <Group title="Due today" tasks={sections.dueToday} projects={projects} minutes={minutes} />

      {sections.doneToday.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
            aria-expanded={showDone}
          >
            {showDone ? <ChevronDown {...ICON} /> : <ChevronRight {...ICON} />}
            Completed today
            <span className="font-normal tabular-nums">{sections.doneToday.length}</span>
          </button>
          {showDone && (
            <div className="mt-3">
              <TaskList tasks={sections.doneToday} projects={projects} minutes={minutes} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5">
      <span className="font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </span>
  )
}

interface GroupProps {
  title: string
  tasks: Task[]
  projects: ReturnType<typeof useProjectMap>
  minutes: Map<string, number>
  note?: string
  danger?: boolean
}

function Group({ title, tasks, projects, minutes, note, danger }: GroupProps) {
  if (!tasks.length) return null
  return (
    <section>
      <h2 className={cls('mb-3 flex items-center gap-2 text-sm font-semibold', danger ? 'text-danger' : 'text-ink')}>
        {danger && <TriangleAlert {...ICON} />}
        {title}
        <span className="font-normal tabular-nums text-ink-muted">{tasks.length}</span>
      </h2>
      {note && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          <TriangleAlert size={14} strokeWidth={2} />
          {note}
        </p>
      )}
      <TaskList tasks={tasks} projects={projects} minutes={minutes} />
    </section>
  )
}

function TaskList({ tasks, projects, minutes }: Omit<GroupProps, 'title'>) {
  const openTask = useUI((s) => s.openTask)
  const today = isoDate(new Date())
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {tasks.map((t) => {
        const project = projects.get(t.projectId)
        const m = minutes.get(t.id) ?? 0
        const done = t.status === 'done'
        return (
          <li
            key={t.id}
            onClick={() => openTask(t.id)}
            className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
          >
            <Checkbox
              round
              checked={done}
              label={done ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`}
              onChange={() => updateTask(t.id, { status: done ? 'todo' : 'done' })}
            />
            <div className="min-w-0 flex-1">
              <p className={cls('truncate text-sm font-medium', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{t.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  {project && <ProjectDot color={project.color} />}
                  {project?.name} · <span className="tabular-nums">{taskKey(project, t.number)}</span>
                </span>
                {t.dueDate && (
                  <span className={cls('inline-flex items-center gap-1', t.dueDate < today && !done && 'font-medium text-danger')}>
                    <CalendarDays size={12} strokeWidth={1.75} />
                    {formatDue(t.dueDate)}
                  </span>
                )}
                {(m > 0 || t.estimateMin) && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock size={12} strokeWidth={1.75} />
                    {formatMinutes(m)}
                    {t.estimateMin ? ` / ${formatMinutes(t.estimateMin)}` : ''}
                  </span>
                )}
              </p>
            </div>
            <span className="hidden sm:block">
              <PriorityIndicator priority={t.priority} />
            </span>
            {!done && <TimerButton taskId={t.id} reveal />}
          </li>
        )
      })}
    </ul>
  )
}
