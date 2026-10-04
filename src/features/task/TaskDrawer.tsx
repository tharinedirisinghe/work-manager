import { CalendarDays, Hourglass, Plus, SignalHigh, SunMedium, Tag, Trash2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { confirmAction } from '../../components/ConfirmDialog'
import { ICON, button, cls, sectionTitle, textarea } from '../../components/styles'
import { LabelChip, Markdown, ProjectDot, StatusIcon } from '../../components/ui'
import { taskKey, useLabels, useProject, useTask } from '../../db/hooks'
import { createLabel } from '../../db/repo/labels'
import { deleteTask, modifyTask, updateTask } from '../../db/repo/tasks'
import { PRIORITIES, STATUSES, type Label, type Priority, type Status, type Task } from '../../db/types'
import { formatMinutes, parseDuration } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'
import { useUI } from '../../store/ui'
import { Checklist } from './Checklist'
import { TimePanel } from './TimePanel'
import { Timeline } from './Timeline'

/** A quiet inline control: looks like text until hovered or focused. */
const field =
  'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-ink transition-colors hover:bg-subtle focus:border-accent focus:bg-surface focus:outline-none focus-visible:outline-none'

export function TaskDrawer() {
  const openTaskId = useUI((s) => s.openTaskId)
  const openTask = useUI((s) => s.openTask)
  const task = useTask(openTaskId)

  useEffect(() => {
    if (!openTaskId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) openTask(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTaskId, openTask])

  if (!openTaskId || !task) return null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-overlay/50" onClick={() => openTask(null)} />
      <aside
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col overflow-y-auto border-l border-line bg-surface shadow-float"
        aria-label="Task details"
      >
        <TaskDetails key={task.id} task={task} onClose={() => openTask(null)} />
      </aside>
    </>
  )
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={sectionTitle}>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Property({ icon, label, children }: { icon: LucideIcon | ReactNode; label: string; children: ReactNode }) {
  const Icon = icon as LucideIcon
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        {typeof icon === 'object' && icon !== null && 'props' in icon ? icon : <Icon {...ICON} className="text-ink-faint" />}
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function TaskDetails({ task, onClose }: { task: Task; onClose: () => void }) {
  const project = useProject(task.projectId)
  const labels = useLabels()
  const [title, setTitle] = useState(task.title)
  const [estimate, setEstimate] = useState(task.estimateMin ? formatMinutes(task.estimateMin) : '')
  const [editingDesc, setEditingDesc] = useState(!task.description)
  const [desc, setDesc] = useState(task.description)
  const [addingLabel, setAddingLabel] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const today = isoDate(new Date())
  const plannedToday = task.plannedFor === today
  const taskLabels = task.labelIds.map((id) => labels.find((l) => l.id === id)).filter((l): l is Label => !!l)
  const otherLabels = labels.filter((l) => !task.labelIds.includes(l.id))

  const saveTitle = () => {
    if (title.trim() && title.trim() !== task.title) updateTask(task.id, { title: title.trim() })
    else setTitle(task.title)
  }
  const saveEstimate = () => {
    const min = estimate.trim() ? parseDuration(estimate) : null
    if (estimate.trim() && min === null) {
      setEstimate(task.estimateMin ? formatMinutes(task.estimateMin) : '')
      return
    }
    if (min !== task.estimateMin) updateTask(task.id, { estimateMin: min })
    setEstimate(min ? formatMinutes(min) : '')
  }
  const saveDesc = () => {
    if (desc !== task.description) updateTask(task.id, { description: desc })
    if (desc.trim()) setEditingDesc(false)
  }
  const toggleLabel = (id: string) =>
    modifyTask(task.id, (t) => ({ labelIds: t.labelIds.includes(id) ? t.labelIds.filter((x) => x !== id) : [...t.labelIds, id] }))

  const addNewLabel = async () => {
    const name = newLabel.trim()
    if (name) {
      const existing = labels.find((l) => l.name.toLowerCase() === name.toLowerCase())
      const id = existing?.id ?? (await createLabel(name))
      await modifyTask(task.id, (t) => ({ labelIds: t.labelIds.includes(id) ? t.labelIds : [...t.labelIds, id] }))
    }
    setNewLabel('')
    setAddingLabel(false)
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/90 px-6 backdrop-blur">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink-muted">
          {project && <ProjectDot color={project.color} />}
          <span className="truncate">{project?.name}</span>
          <span className="text-ink-faint">/</span>
          <span className="font-medium tabular-nums text-ink">{taskKey(project, task.number)}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cls(button.icon, 'hover:bg-danger-soft hover:text-danger')}
            title="Delete task"
            aria-label="Delete task"
            onClick={async () => {
              const ok = await confirmAction({
                title: 'Delete this task?',
                body: `“${task.title}” and its time entries and comments will be deleted. This can’t be undone.`,
                confirmLabel: 'Delete task',
                danger: true,
              })
              if (!ok) return
              onClose()
              await deleteTask(task.id)
            }}
          >
            <Trash2 {...ICON} />
          </button>
          <button type="button" className={button.icon} onClick={onClose} aria-label="Close" title="Close (Esc)">
            <X {...ICON} size={18} />
          </button>
        </div>
      </header>

      <div className="px-6 pt-5 pb-2">
        <textarea
          rows={1}
          className="w-full resize-none rounded-lg bg-transparent text-xl leading-snug font-semibold tracking-tight text-ink outline-none [field-sizing:content] focus-visible:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          aria-label="Title"
        />
      </div>

      <div className="space-y-1 px-6 pb-5">
        <Property icon={<StatusIcon status={task.status} />} label="Status">
          <select className={field} value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as Status })} aria-label="Status">
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Property>
        <Property icon={SignalHigh} label="Priority">
          <select className={field} value={task.priority} onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })} aria-label="Priority">
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Property>
        <Property icon={CalendarDays} label="Due date">
          <input
            type="date"
            className={cls(field, !task.dueDate && 'text-ink-faint')}
            value={task.dueDate ?? ''}
            onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
            aria-label="Due date"
          />
        </Property>
        <Property icon={Hourglass} label="Estimate">
          <input
            className={field}
            placeholder="Add estimate, e.g. 2h"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            onBlur={saveEstimate}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Estimate"
          />
        </Property>
        <Property icon={SunMedium} label="Today">
          <button
            type="button"
            role="switch"
            aria-checked={plannedToday}
            onClick={() => updateTask(task.id, { plannedFor: plannedToday ? null : today })}
            className={cls(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
              plannedToday ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            <SunMedium size={13} strokeWidth={2} />
            {plannedToday ? 'Planned for today' : 'Plan for today'}
          </button>
        </Property>
        <Property icon={Tag} label="Labels">
          <div className="flex min-h-8 flex-wrap items-center gap-1.5 px-2">
            {taskLabels.map((l) => (
              <LabelChip key={l.id} label={l} onRemove={() => toggleLabel(l.id)} />
            ))}
            {addingLabel ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  list="label-options"
                  className="h-6 w-36 rounded-md border border-line bg-surface px-2 text-xs focus:border-accent focus:outline-none"
                  placeholder="Label name"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addNewLabel()
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setAddingLabel(false)
                    }
                  }}
                  onBlur={addNewLabel}
                />
                <datalist id="label-options">
                  {otherLabels.map((l) => (
                    <option key={l.id} value={l.name} />
                  ))}
                </datalist>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAddingLabel(true)}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-line-strong px-2 text-xs text-ink-muted hover:border-accent hover:text-accent-ink"
              >
                <Plus size={12} strokeWidth={2} />
                Add label
              </button>
            )}
          </div>
        </Property>
      </div>

      <Section title="Description">
        {editingDesc ? (
          <>
            <textarea
              autoFocus={!!task.description}
              className={cls(textarea, 'min-h-28 resize-y')}
              placeholder="Add details, links, notes… Markdown is supported."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={saveDesc}
            />
            <p className="mt-1.5 text-xs text-ink-muted">Saves when you click outside.</p>
          </>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setEditingDesc(true)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(true)}
            className="-mx-2 cursor-text rounded-lg px-2 py-1 transition-colors hover:bg-subtle"
            title="Click to edit"
          >
            <Markdown>{task.description}</Markdown>
          </div>
        )}
      </Section>

      <Section title="Checklist">
        <Checklist task={task} />
      </Section>

      <Section title="Time">
        <TimePanel task={task} />
      </Section>

      <Section title="Activity">
        <Timeline taskId={task.id} />
      </Section>
    </>
  )
}
