import {
  Check,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Pause,
  Play,
  SignalHigh,
  SignalLow,
  SignalMedium,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { useRunningEntry } from '../db/hooks'
import { startTimer, stopTimer } from '../db/repo/time'
import type { Label, Priority, Status } from '../db/types'
import { priorityLabel, statusLabel } from '../db/types'
import { ICON, button, cls, tint } from './styles'

const PRIORITY_META: Record<Priority, { icon: LucideIcon; tone: string }> = {
  low: { icon: SignalLow, tone: 'text-ink-faint' },
  medium: { icon: SignalMedium, tone: 'text-ink-muted' },
  high: { icon: SignalHigh, tone: 'text-warning' },
  urgent: { icon: CircleAlert, tone: 'text-danger' },
}

/** Priority as a signal icon plus a word, so it's never conveyed by color alone. */
export function PriorityIndicator({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const { icon: Icon, tone } = PRIORITY_META[priority]
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted" title={`${priorityLabel(priority)} priority`}>
      <Icon {...ICON} size={14} className={tone} aria-hidden />
      {showLabel && priorityLabel(priority)}
    </span>
  )
}

const STATUS_META: Record<Status, { icon: LucideIcon; tone: string }> = {
  backlog: { icon: CircleDashed, tone: 'text-ink-faint' },
  todo: { icon: Circle, tone: 'text-ink-muted' },
  in_progress: { icon: CircleDot, tone: 'text-warning' },
  done: { icon: CircleCheck, tone: 'text-success' },
}

export function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const { icon: Icon, tone } = STATUS_META[status]
  return <Icon size={size} strokeWidth={ICON.strokeWidth} className={cls('shrink-0', tone)} aria-label={statusLabel(status)} />
}

export function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 rounded-full pr-2 pl-1.5 text-xs font-medium text-ink"
      style={{ backgroundColor: tint(label.color) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="-mr-1 rounded-full text-ink-muted hover:text-ink" aria-label={`Remove label ${label.name}`}>
          <X size={12} strokeWidth={2} />
        </button>
      )}
    </span>
  )
}

export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return <span className={cls('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}

/** `reveal`: when idle, only show on hover/focus of the parent `group` (on devices that can hover). */
export function TimerButton({ taskId, size = 'sm', reveal }: { taskId: string; size?: 'sm' | 'md'; reveal?: boolean }) {
  const running = useRunningEntry()
  const active = running?.taskId === taskId
  const Icon = active ? Pause : Play
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (active) stopTimer()
        else startTimer(taskId)
      }}
      title={active ? 'Stop timer' : 'Start timer'}
      aria-label={active ? 'Stop timer' : 'Start timer'}
      className={cls(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        size === 'sm' ? 'h-6 w-6' : 'h-9 w-9',
        active
          ? 'bg-accent text-on-accent hover:bg-accent-hover'
          : size === 'md'
            ? 'bg-accent-soft text-accent-ink hover:bg-accent hover:text-on-accent'
            : 'text-ink-faint hover:bg-accent-soft hover:text-accent-ink',
        reveal && !active && '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      )}
    >
      <Icon size={size === 'sm' ? 13 : 16} strokeWidth={2} fill="currentColor" />
    </button>
  )
}

export function Checkbox({ checked, onChange, label, round }: { checked: boolean; onChange: () => void; label: string; round?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cls(
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors',
        round ? 'rounded-full' : 'rounded-[5px]',
        checked ? 'border-success bg-success text-surface' : 'border-line-strong bg-surface hover:border-accent',
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  )
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink [&_a]:text-accent-ink [&_a]:underline [&_code]:rounded [&_code]:bg-subtle [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-overlay p-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cls('w-full rounded-2xl border border-line bg-surface p-5 shadow-float', wide ? 'max-w-xl' : 'max-w-md')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button type="button" className={button.icon} onClick={onClose} aria-label="Close" title="Close">
            <X {...ICON} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon size={20} strokeWidth={ICON.strokeWidth} />
        </span>
      )}
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1.5 max-w-sm">{children}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-subtle px-1 font-sans text-[11px] font-medium text-ink-muted">
      {children}
    </kbd>
  )
}
