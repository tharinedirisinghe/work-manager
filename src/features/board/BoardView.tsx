import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ICON, cls, input } from '../../components/styles'
import { StatusIcon } from '../../components/ui'
import { useLabels, useMinutesByTask } from '../../db/hooks'
import { useSetting } from '../../db/repo/settings'
import { createTask, updateTask } from '../../db/repo/tasks'
import { STATUSES, type Label, type Project, type Status, type Task } from '../../db/types'
import { orderBetween } from '../../lib/order'
import { useUI } from '../../store/ui'
import { TaskCard } from './TaskCard'

type Columns = Record<Status, string[]>

function groupTasks(tasks: Task[]): Columns {
  const cols: Columns = { backlog: [], todo: [], in_progress: [], done: [] }
  for (const t of [...tasks].sort((a, b) => a.order - b.order)) cols[t.status].push(t.id)
  return cols
}

export function BoardView({ project, tasks }: { project: Project; tasks: Task[] }) {
  const labels = useLabels()
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const minutes = useMinutesByTask()
  const wipLimit = useSetting('wipLimit')
  const openTask = useUI((s) => s.openTask)

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const fromDb = useMemo(() => groupTasks(tasks), [tasks])
  const [columns, setColumns] = useState<Columns>(fromDb)
  const [activeId, setActiveId] = useState<string | null>(null)
  const dragging = useRef(false)

  // Follow the database except mid-drag, when the local order is the source of truth.
  useEffect(() => {
    if (!dragging.current) setColumns(fromDb)
  }, [fromDb])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findColumn = (id: string): Status | undefined =>
    id in columns ? (id as Status) : STATUSES.find((s) => columns[s.id].includes(id))?.id

  const onDragStart = (e: DragStartEvent) => {
    dragging.current = true
    setActiveId(String(e.active.id))
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const id = String(active.id)
    const from = findColumn(id)
    const to = findColumn(String(over.id))
    if (!from || !to || from === to) return
    setColumns((prev) => {
      const toItems = [...prev[to]]
      const overIndex = toItems.indexOf(String(over.id))
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, id)
      return { ...prev, [from]: prev[from].filter((x) => x !== id), [to]: toItems }
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    dragging.current = false
    setActiveId(null)
    const id = String(active.id)
    const col = findColumn(id)
    if (!over || !col) {
      setColumns(fromDb)
      return
    }
    let items = columns[col]
    const oldIndex = items.indexOf(id)
    const overIndex = items.indexOf(String(over.id))
    if (overIndex >= 0 && overIndex !== oldIndex) items = arrayMove(items, oldIndex, overIndex)
    setColumns({ ...columns, [col]: items })

    const i = items.indexOf(id)
    const task = taskMap.get(id)
    const prevTask = taskMap.get(items[i - 1])
    const nextTask = taskMap.get(items[i + 1])
    const unchanged = task?.status === col && (!prevTask || prevTask.order < task.order) && (!nextTask || nextTask.order > task.order)
    if (task && !unchanged) {
      updateTask(id, { status: col, order: orderBetween(prevTask?.order, nextTask?.order) })
    }
  }

  const activeTask = activeId ? taskMap.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dragging.current = false
        setActiveId(null)
        setColumns(fromDb)
      }}
    >
      <div className="grid grid-cols-1 items-start gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => (
          <Column
            key={s.id}
            status={s.id}
            label={s.label}
            ids={columns[s.id]}
            taskMap={taskMap}
            project={project}
            labelMap={labelMap}
            minutes={minutes}
            wipLimit={s.id === 'in_progress' ? wipLimit : 0}
            onOpen={openTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} project={project} labels={labelMap} minutes={minutes.get(activeTask.id) ?? 0} dragging />
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface ColumnProps {
  status: Status
  label: string
  ids: string[]
  taskMap: Map<string, Task>
  project: Project
  labelMap: Map<string, Label>
  minutes: Map<string, number>
  wipLimit: number
  onOpen: (id: string) => void
}

function Column({ status, label, ids, taskMap, project, labelMap, minutes, wipLimit, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const overLimit = wipLimit > 0 && ids.length > wipLimit
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const add = async () => {
    if (title.trim()) await createTask({ projectId: project.id, title, status })
    setTitle('')
  }

  return (
    <section className={cls('flex min-h-40 flex-col rounded-2xl bg-subtle/70 p-2 transition-shadow', isOver && 'ring-2 ring-accent/30')}>
      <header className="mb-1 flex h-8 items-center gap-2 px-2">
        <StatusIcon status={status} />
        <h3 className="text-[13px] font-semibold text-ink">{label}</h3>
        <span className="text-xs tabular-nums text-ink-muted">{ids.length}</span>
        {wipLimit > 0 && (
          <span
            className={cls(
              'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
              overLimit ? 'bg-warning-soft font-medium text-warning' : 'text-ink-muted',
            )}
            title="Work-in-progress limit: finish tasks before starting new ones"
          >
            {overLimit && <TriangleAlert size={12} strokeWidth={2} />}
            {overLimit ? `Over limit of ${wipLimit}` : `Limit ${wipLimit}`}
          </span>
        )}
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-12 flex-col gap-2">
          {ids.map((id) => {
            const task = taskMap.get(id)
            return task ? (
              <SortableCard key={id} id={id}>
                <TaskCard task={task} project={project} labels={labelMap} minutes={minutes.get(id) ?? 0} onOpen={() => onOpen(id)} />
              </SortableCard>
            ) : null
          })}
          {ids.length === 0 && !adding && (
            <p className="flex h-12 items-center justify-center rounded-xl border border-dashed border-line-strong text-xs text-ink-faint">
              {status === 'done' ? 'Finished tasks land here' : 'No tasks'}
            </p>
          )}
        </div>
      </SortableContext>
      {status !== 'done' &&
        (adding ? (
          <input
            autoFocus
            className={cls(input, 'mt-2')}
            placeholder="Task title, then Enter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
              if (e.key === 'Escape') {
                setTitle('')
                setAdding(false)
              }
            }}
            onBlur={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <Plus {...ICON} />
            Add task
          </button>
        ))}
    </section>
  )
}

function SortableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cls(isDragging && 'opacity-30')}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
