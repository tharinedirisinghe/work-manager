import { CalendarDays, ChartNoAxesColumn, CirclePlus, CornerDownLeft, Hourglass, Search, Settings, SunMedium, Tag } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { ICON, cls } from '../../components/styles'
import { Kbd, PriorityIndicator, ProjectDot, StatusIcon } from '../../components/ui'
import { taskKey, useProjectMap, useProjects, useTasks } from '../../db/hooks'
import { ensureLabels } from '../../db/repo/labels'
import { setSetting, useSetting } from '../../db/repo/settings'
import { createTask } from '../../db/repo/tasks'
import type { Project, Task } from '../../db/types'
import { formatDue } from '../../lib/dates'
import { parseQuickAdd } from '../../lib/quickAddParser'
import { formatMinutes } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'
import { useUI } from '../../store/ui'

interface Item {
  id: string
  icon: ReactNode
  label: ReactNode
  hint?: string
  run: () => void | Promise<void>
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  // Loaded here (always mounted) rather than in PaletteBody, so the data is ready
  // the moment the palette opens instead of flashing an empty state.
  const data: PaletteData = {
    projects: useProjects(),
    projectMap: useProjectMap(),
    tasks: useTasks(),
    defaultProjectId: useSetting('defaultProjectId'),
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-overlay p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search or add a task"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PaletteBody data={data} onClose={() => setOpen(false)} />
      </div>
    </div>
  )
}

const chip = 'inline-flex h-6 items-center gap-1 rounded-full bg-subtle px-2 text-xs text-ink-muted'

interface PaletteData {
  projects: Project[]
  projectMap: Map<string, Project>
  tasks: Task[]
  defaultProjectId: string | null
}

function PaletteBody({ data, onClose }: { data: PaletteData; onClose: () => void }) {
  const { projects, projectMap, tasks, defaultProjectId } = data
  const openTask = useUI((s) => s.openTask)
  const navigate = useNavigate()
  const match = useMatch('/p/:projectId')
  const activeProjects = projects.filter((p) => !p.archived)

  const [text, setText] = useState('')
  const [chosenProject, setChosenProject] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  // Until the user picks one: the project being viewed, then the last one used, then the first.
  const projectId =
    chosenProject ?? [match?.params.projectId, defaultProjectId, activeProjects[0]?.id].find((id) => id && projectMap.has(id)) ?? ''

  const parsed = parseQuickAdd(text)

  const items = useMemo<Item[]>(() => {
    const list: Item[] = []
    const q = text.trim().toLowerCase()
    if (parsed.title && projectId) {
      list.push({
        id: 'create',
        icon: <CirclePlus {...ICON} className="text-accent" />,
        label: (
          <span>
            Create <span className="font-medium text-ink">“{parsed.title}”</span>
          </span>
        ),
        hint: `in ${projectMap.get(projectId)?.name ?? ''}`,
        run: async () => {
          await createTask({
            projectId,
            title: parsed.title,
            priority: parsed.priority,
            labelIds: await ensureLabels(parsed.labels),
            dueDate: parsed.dueDate ?? null,
            estimateMin: parsed.estimateMin ?? null,
            plannedFor: parsed.today ? isoDate(new Date()) : null,
          })
          setSetting('defaultProjectId', projectId)
        },
      })
    }
    if (q) {
      for (const t of tasks) {
        const project = projectMap.get(t.projectId)
        const key = taskKey(project, t.number)
        if (!t.title.toLowerCase().includes(q) && !key.toLowerCase().includes(q)) continue
        list.push({
          id: t.id,
          icon: <StatusIcon status={t.status} />,
          label: (
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-medium tabular-nums text-ink-muted">{key}</span>
              <span className={cls('truncate', t.status === 'done' ? 'text-ink-muted line-through' : 'text-ink')}>{t.title}</span>
            </span>
          ),
          hint: project?.name,
          run: () => openTask(t.id),
        })
        if (list.length >= 9) break
      }
      const nav = [
        { id: 'nav-today', name: 'Today', to: '/today', icon: <SunMedium {...ICON} className="text-ink-faint" /> },
        { id: 'nav-review', name: 'Weekly review', to: '/review', icon: <ChartNoAxesColumn {...ICON} className="text-ink-faint" /> },
        { id: 'nav-settings', name: 'Settings', to: '/settings', icon: <Settings {...ICON} className="text-ink-faint" /> },
        ...activeProjects.map((p) => ({
          id: `nav-${p.id}`,
          name: p.name,
          to: `/p/${p.id}`,
          icon: (
            <span className="flex w-4 justify-center">
              <ProjectDot color={p.color} />
            </span>
          ),
        })),
      ]
      for (const n of nav) {
        if (n.name.toLowerCase().includes(q)) list.push({ id: n.id, icon: n.icon, label: `Go to ${n.name}`, hint: 'Jump to', run: () => navigate(n.to) })
      }
    }
    return list
  }, [text, projectId, tasks, projectMap, activeProjects, navigate, openTask, parsed])

  const runAt = async (i: number) => {
    const item = items[i]
    if (!item) return
    onClose()
    await item.run()
  }

  const hasTokens = parsed.priority || parsed.labels.length || parsed.dueDate || parsed.estimateMin || parsed.today

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search {...ICON} size={18} className="shrink-0 text-ink-faint" />
        <input
          autoFocus
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none"
          placeholder="Search, or type a new task…"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setIndex(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              runAt(index)
            }
          }}
          aria-label="Search or new task"
        />
        {activeProjects.length > 0 && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
            <ProjectDot color={projectMap.get(projectId)?.color ?? 'transparent'} />
            <select
              className="max-w-32 rounded-md bg-transparent py-1 text-xs font-medium text-ink hover:bg-subtle focus:outline-none"
              value={projectId}
              onChange={(e) => setChosenProject(e.target.value)}
              aria-label="Project for new task"
            >
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {parsed.title && hasTokens && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
          {parsed.priority && (
            <span className={chip}>
              <PriorityIndicator priority={parsed.priority} />
            </span>
          )}
          {parsed.labels.map((l) => (
            <span key={l} className={chip}>
              <Tag size={12} strokeWidth={2} />
              {l}
            </span>
          ))}
          {parsed.dueDate && (
            <span className={chip}>
              <CalendarDays size={12} strokeWidth={2} />
              {formatDue(parsed.dueDate)}
            </span>
          )}
          {parsed.estimateMin && (
            <span className={chip}>
              <Hourglass size={12} strokeWidth={2} />
              {formatMinutes(parsed.estimateMin)}
            </span>
          )}
          {parsed.today && (
            <span className={cls(chip, 'bg-accent-soft text-accent-ink')}>
              <SunMedium size={12} strokeWidth={2} />
              Today
            </span>
          )}
        </div>
      )}

      {activeProjects.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-muted">Create a project first, using the + next to Projects in the sidebar.</p>
      ) : items.length > 0 ? (
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {items.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => runAt(i)}
                className={cls(
                  'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-ink-muted',
                  i === index && 'bg-subtle',
                )}
              >
                <span className="flex w-4 shrink-0 justify-center">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-xs text-ink-muted">{item.hint}</span>}
                {i === index && <CornerDownLeft size={14} className="shrink-0 text-ink-faint" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-5 text-sm text-ink-muted">
          <p className="mb-2 font-medium text-ink">Type a task. Shortcuts set its details:</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {[
              ['!high', 'Priority (!low … !urgent)'],
              ['#label', 'Add a label'],
              ['due:fri', 'Due date (today, +3d, 2026-10-30)'],
              ['~2h', 'Estimate'],
              ['@today', 'Plan for today'],
            ].map(([token, what]) => (
              <li key={token} className="flex items-center gap-2">
                <code className="rounded bg-subtle px-1.5 py-0.5 text-xs font-medium text-ink">{token}</code>
                <span className="text-xs">{what}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 border-t border-line bg-canvas px-4 py-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Enter</Kbd> to select
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>Esc</Kbd> to close
        </span>
      </div>
    </>
  )
}
