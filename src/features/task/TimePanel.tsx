import { format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { ICON, button, cls, input, inputAuto } from '../../components/styles'
import { TimerButton } from '../../components/ui'
import { useTimeEntries } from '../../db/hooks'
import { addManualEntry, deleteEntry } from '../../db/repo/time'
import type { Task } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { entryMinutes, formatClock, formatMinutes, parseDuration, totalMinutes } from '../../lib/time'
import { isoDate } from '../../lib/weeklyStats'

export function TimePanel({ task }: { task: Task }) {
  const entries = useTimeEntries(task.id)
  const running = entries.find((e) => e.end === null)
  const now = useNow(!!running)
  const total = totalMinutes(entries, now)
  const pct = task.estimateMin ? Math.min(100, (total / task.estimateMin) * 100) : 0
  const over = !!task.estimateMin && total > task.estimateMin

  const [adding, setAdding] = useState(false)
  const [duration, setDuration] = useState('')
  const [date, setDate] = useState(() => isoDate(new Date()))
  const [note, setNote] = useState('')
  const parsed = parseDuration(duration)

  const add = async () => {
    if (!parsed) return
    const end = date === isoDate(new Date()) ? Date.now() : new Date(`${date}T17:00:00`).getTime()
    await addManualEntry(task.id, parsed, end, note.trim())
    setDuration('')
    setNote('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center gap-4 rounded-xl border border-line bg-canvas p-3">
        <TimerButton taskId={task.id} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold tabular-nums text-ink">{running ? formatClock(now - running.start) : formatMinutes(total)}</span>
            <span className="text-xs text-ink-muted">
              {running && `${formatMinutes(total)} total · `}
              {task.estimateMin ? `${formatMinutes(task.estimateMin)} estimated` : 'No estimate'}
            </span>
          </div>
          {task.estimateMin ? (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className={cls('h-full rounded-full transition-all', over ? 'bg-danger' : 'bg-accent')} style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          {over && <p className="mt-1 text-xs font-medium text-danger">{formatMinutes(total - task.estimateMin!)} over the estimate</p>}
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="mt-3 max-h-44 overflow-y-auto text-sm">
          {[...entries].reverse().map((e) => (
            <li key={e.id} className="group -mx-2 flex h-8 items-center gap-3 rounded-lg px-2 hover:bg-subtle/60">
              <span className="w-32 shrink-0 text-xs text-ink-muted">{format(e.start, 'EEE d MMM, HH:mm')}</span>
              <span className="w-16 shrink-0 text-xs font-medium tabular-nums text-ink">
                {e.end === null ? <span className="text-accent-ink">Running</span> : formatMinutes(entryMinutes(e))}
              </span>
              <span className="flex-1 truncate text-xs text-ink-muted">{e.note}</span>
              {e.end !== null && (
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  className="rounded p-0.5 text-ink-faint opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label="Delete time entry"
                  title="Delete entry"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            autoFocus
            className={input}
            placeholder="Duration, e.g. 1h30m"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label="Duration"
          />
          <input type="date" className={inputAuto} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <input className={cls(input, 'col-span-2')} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" className={button.secondary} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="button" className={button.primary} disabled={!parsed} onClick={add}>
              Log {parsed ? formatMinutes(parsed) : 'time'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={cls(button.ghost, 'mt-2 -ml-2.5')} onClick={() => setAdding(true)}>
          <Plus {...ICON} />
          Log time manually
        </button>
      )}
    </div>
  )
}
