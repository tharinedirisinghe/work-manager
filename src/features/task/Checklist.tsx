import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { ICON, cls } from '../../components/styles'
import { Checkbox } from '../../components/ui'
import { newId } from '../../db/schema'
import { modifyTask } from '../../db/repo/tasks'
import type { ChecklistItem, Task } from '../../db/types'

export function Checklist({ task }: { task: Task }) {
  const [text, setText] = useState('')
  // Each change is applied to the latest saved list, so fast successive edits all stick.
  const change = (fn: (list: ChecklistItem[]) => ChecklistItem[]) => modifyTask(task.id, (t) => ({ checklist: fn(t.checklist) }))
  const done = task.checklist.filter((c) => c.done).length

  const add = () => {
    if (!text.trim()) return
    const item = { id: newId(), text: text.trim(), done: false }
    change((list) => [...list, item])
    setText('')
  }

  return (
    <div>
      {task.checklist.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done / task.checklist.length) * 100}%` }} />
          </div>
          <span className="text-xs tabular-nums text-ink-muted">
            {done}/{task.checklist.length}
          </span>
        </div>
      )}
      <ul className="space-y-0.5">
        {task.checklist.map((item) => (
          <li key={item.id} className="group -mx-2 flex min-h-8 items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-subtle/60">
            <Checkbox
              checked={item.done}
              label={item.text}
              onChange={() => change((list) => list.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)))}
            />
            <span className={cls('flex-1', item.done ? 'text-ink-muted line-through decoration-ink-faint' : 'text-ink')}>{item.text}</span>
            <button
              type="button"
              onClick={() => change((list) => list.filter((c) => c.id !== item.id))}
              className="rounded p-0.5 text-ink-faint opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Remove “${item.text}”`}
              title="Remove"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <label className="-mx-2 mt-1 flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm text-ink-muted focus-within:bg-subtle/60">
        <Plus {...ICON} className="ml-px text-ink-faint" />
        <input
          className="flex-1 bg-transparent text-ink outline-none focus-visible:outline-none"
          placeholder="Add an item"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          aria-label="New checklist item"
        />
      </label>
    </div>
  )
}
