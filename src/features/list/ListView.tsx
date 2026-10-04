import { CalendarDays, Clock, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ICON, cls, input, inputAuto } from '../../components/styles'
import { EmptyState, LabelChip, PriorityIndicator, StatusIcon, TimerButton } from '../../components/ui'
import { taskKey, useLabels, useMinutesByTask } from '../../db/hooks'
import { PRIORITIES, STATUSES, priorityRank, statusLabel, type Label, type Project, type Task } from '../../db/types'
import { formatDue } from '../../lib/dates'
import { formatMinutes } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'
import { useUI } from '../../store/ui'

type Sort = 'order' | 'priority' | 'due' | 'updated'
type DueFilter = 'all' | 'overdue' | 'week' | 'none'

export function ListView({ project, tasks }: { project: Project; tasks: Task[] }) {
  const labels = useLabels()
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const minutes = useMinutesByTask()
  const openTask = useUI((s) => s.openTask)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('all')
  const [label, setLabel] = useState('all')
  const [due, setDue] = useState<DueFilter>('all')
  const [sort, setSort] = useState<Sort>('order')

  const today = isoDate(new Date())
  const weekAhead = isoDate(Date.now() + 7 * 86400000)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const key = (t: Task) => taskKey(project, t.number).toLowerCase()
    const statusIndex = (t: Task) => STATUSES.findIndex((s) => s.id === t.status)
    return tasks
      .filter((t) => !q || t.title.toLowerCase().includes(q) || key(t).includes(q) || t.description.toLowerCase().includes(q))
      .filter((t) => (status === 'all' ? true : status === 'open' ? t.status !== 'done' : t.status === status))
      .filter((t) => priority === 'all' || t.priority === priority)
      .filter((t) => label === 'all' || t.labelIds.includes(label))
      .filter((t) => {
        if (due === 'overdue') return !!t.dueDate && t.dueDate < today && t.status !== 'done'
        if (due === 'week') return !!t.dueDate && t.dueDate >= today && t.dueDate <= weekAhead
        if (due === 'none') return !t.dueDate
        return true
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityRank(b.priority) - priorityRank(a.priority)
        if (sort === 'due') return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
        if (sort === 'updated') return b.updatedAt - a.updatedAt
        return statusIndex(a) - statusIndex(b) || a.order - b.order
      })
  }, [tasks, search, status, priority, label, due, sort, project, today, weekAhead])

  const select = cls(inputAuto, 'pr-7')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full max-w-xs">
          <Search {...ICON} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-faint" />
          <input
            id="list-search"
            className={cls(input, 'pl-8')}
            placeholder="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
        </label>
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="open">Open tasks</option>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select className={select} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority filter">
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select className={select} value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Label filter">
          <option value="all">Any label</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className={select} value={due} onChange={(e) => setDue(e.target.value as DueFilter)} aria-label="Due date filter">
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due in 7 days</option>
          <option value="none">No due date</option>
        </select>
        <select className={cls(select, 'sm:ml-auto')} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
          <option value="order">Sort: board order</option>
          <option value="priority">Sort: priority</option>
          <option value="due">Sort: due date</option>
          <option value="updated">Sort: recently updated</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No tasks match these filters">
          Try clearing the search or choosing “All statuses”.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {filtered.map((t) => {
            const m = minutes.get(t.id) ?? 0
            const done = t.status === 'done'
            const overdue = !!t.dueDate && t.dueDate < today && !done
            return (
              <li
                key={t.id}
                onClick={() => openTask(t.id)}
                className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-subtle/60"
              >
                <span title={statusLabel(t.status)}>
                  <StatusIcon status={t.status} />
                </span>
                <span className="w-16 shrink-0 text-xs font-medium tabular-nums text-ink-muted">{taskKey(project, t.number)}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cls('truncate font-medium', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{t.title}</span>
                  <span className="hidden gap-1 md:flex">
                    {t.labelIds
                      .map((id) => labelMap.get(id))
                      .filter((l): l is Label => !!l)
                      .map((l) => (
                        <LabelChip key={l.id} label={l} />
                      ))}
                  </span>
                </span>
                <span className="hidden w-20 sm:block">
                  <PriorityIndicator priority={t.priority} />
                </span>
                <span className={cls('hidden w-24 items-center gap-1 text-xs sm:flex', overdue ? 'font-medium text-danger' : 'text-ink-muted')}>
                  {t.dueDate && (
                    <>
                      <CalendarDays size={13} strokeWidth={1.75} />
                      {formatDue(t.dueDate)}
                    </>
                  )}
                </span>
                <span className="hidden w-24 items-center gap-1 text-xs tabular-nums text-ink-muted md:flex">
                  {(m > 0 || t.estimateMin) && (
                    <>
                      <Clock size={13} strokeWidth={1.75} />
                      {formatMinutes(m)}
                      {t.estimateMin ? ` / ${formatMinutes(t.estimateMin)}` : ''}
                    </>
                  )}
                </span>
                <span className="w-6">{!done && <TimerButton taskId={t.id} reveal />}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
