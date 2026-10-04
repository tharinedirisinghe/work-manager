import { CalendarDays, Clock, ListChecks } from 'lucide-react'
import { cls } from '../../components/styles'
import { LabelChip, PriorityIndicator, TimerButton } from '../../components/ui'
import { taskKey } from '../../db/hooks'
import type { Label, Project, Task } from '../../db/types'
import { formatDue } from '../../lib/dates'
import { formatMinutes } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'

interface Props {
  task: Task
  project: Project | null | undefined
  labels: Map<string, Label>
  minutes: number
  onOpen?: () => void
  dragging?: boolean
}

const meta = 'inline-flex items-center gap-1'

export function TaskCard({ task, project, labels, minutes, onOpen, dragging }: Props) {
  const today = isoDate(new Date())
  const done = task.status === 'done'
  const overdue = !!task.dueDate && !done && task.dueDate < today
  const doneItems = task.checklist.filter((c) => c.done).length
  const over = !!task.estimateMin && minutes > task.estimateMin
  const taskLabels = task.labelIds.map((id) => labels.get(id)).filter((l): l is Label => !!l)

  return (
    <div
      onClick={onOpen}
      className={cls(
        'group cursor-pointer rounded-xl border bg-surface p-3 text-sm transition-[border-color,box-shadow]',
        dragging ? 'rotate-[1.5deg] border-accent shadow-float' : 'border-line shadow-card hover:border-line-strong',
      )}
    >
      <div className="flex items-start gap-2">
        <p className={cls('flex-1 leading-snug font-medium', done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>
          {task.title}
        </p>
        {!done && (
          <span className="-mt-0.5 -mr-1">
            <TimerButton taskId={task.id} reveal />
          </span>
        )}
      </div>

      {taskLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="font-medium tabular-nums">{taskKey(project, task.number)}</span>
        {/* Only flag what needs attention; low/medium stay quiet on the board. */}
        {(task.priority === 'high' || task.priority === 'urgent') && <PriorityIndicator priority={task.priority} />}
        {task.dueDate && (
          <span className={cls(meta, overdue && 'font-medium text-danger')} title={`Due ${task.dueDate}`}>
            <CalendarDays size={13} strokeWidth={1.75} />
            {formatDue(task.dueDate)}
          </span>
        )}
        {(task.estimateMin || minutes > 0) && (
          <span className={cls(meta, 'tabular-nums', over && 'font-medium text-danger')} title="Time tracked / estimate">
            <Clock size={13} strokeWidth={1.75} />
            {formatMinutes(minutes)}
            {task.estimateMin ? ` / ${formatMinutes(task.estimateMin)}` : ''}
          </span>
        )}
        {task.checklist.length > 0 && (
          <span className={cls(meta, 'tabular-nums', doneItems === task.checklist.length && 'text-success')} title="Checklist">
            <ListChecks size={13} strokeWidth={1.75} />
            {doneItems}/{task.checklist.length}
          </span>
        )}
      </div>
    </div>
  )
}
