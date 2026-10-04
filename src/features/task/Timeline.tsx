import { formatDistanceToNow } from 'date-fns'
import { ArrowRightLeft, CalendarDays, CirclePlus, Hourglass, MessageSquare, SignalHigh, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { confirmAction } from '../../components/ConfirmDialog'
import { button, cls, textarea } from '../../components/styles'
import { Markdown } from '../../components/ui'
import { useActivity, useComments } from '../../db/hooks'
import { addComment, deleteComment, editComment } from '../../db/repo/comments'
import { priorityLabel, statusLabel, type Activity, type ActivityType, type Comment, type Priority, type Status } from '../../db/types'
import { formatDue } from '../../lib/dates'
import { formatMinutes } from '../../lib/time'

const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  created: CirclePlus,
  status: ArrowRightLeft,
  priority: SignalHigh,
  due: CalendarDays,
  estimate: Hourglass,
  comment: MessageSquare,
}

function describe(a: Activity): string {
  switch (a.type) {
    case 'created':
      return 'Created the task'
    case 'status':
      return `Moved from ${statusLabel(a.from as Status)} to ${statusLabel(a.to as Status)}`
    case 'priority':
      return `Changed priority from ${priorityLabel(a.from as Priority)} to ${priorityLabel(a.to as Priority)}`
    case 'due':
      return a.to ? `Set due date to ${formatDue(a.to)}` : 'Removed the due date'
    case 'estimate':
      return a.to ? `Set estimate to ${formatMinutes(Number(a.to))}` : 'Removed the estimate'
    case 'comment':
      return 'Commented'
  }
}

const ago = (t: number) => formatDistanceToNow(t, { addSuffix: true })

export function Timeline({ taskId }: { taskId: string }) {
  const comments = useComments(taskId)
  const activity = useActivity(taskId)
  const [body, setBody] = useState('')

  // Comments already appear in full, so their "commented" activity entries are skipped.
  const items: ({ kind: 'comment'; at: number; c: Comment } | { kind: 'activity'; at: number; a: Activity })[] = [
    ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, c })),
    ...activity.filter((a) => a.type !== 'comment').map((a) => ({ kind: 'activity' as const, at: a.at, a })),
  ].sort((x, y) => y.at - x.at)

  const submit = async () => {
    if (!body.trim()) return
    await addComment(taskId, body)
    setBody('')
  }

  return (
    <div>
      <div className="rounded-xl border border-line bg-surface focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15">
        <textarea
          className="block min-h-20 w-full resize-y rounded-t-xl bg-transparent px-3 py-2.5 text-sm text-ink outline-none focus-visible:outline-none"
          placeholder="Write a comment… Markdown is supported."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && submit()}
          aria-label="New comment"
        />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <span className="text-xs text-ink-muted">Ctrl + Enter to post</span>
          <button type="button" className={button.primary} disabled={!body.trim()} onClick={submit}>
            Comment
          </button>
        </div>
      </div>

      <ol className="relative mt-5 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line">
        {items.map((item) =>
          item.kind === 'comment' ? (
            <CommentItem key={item.c.id} comment={item.c} />
          ) : (
            <ActivityItem key={item.a.id} activity={item.a} />
          ),
        )}
      </ol>
    </div>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICON[activity.type]
  return (
    <li className="relative flex items-center gap-3 text-xs text-ink-muted">
      <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
        <Icon size={12} strokeWidth={2} className="text-ink-faint" />
      </span>
      <span>
        {describe(activity)} · <time dateTime={new Date(activity.at).toISOString()}>{ago(activity.at)}</time>
      </span>
    </li>
  )
}

function CommentItem({ comment }: { comment: Comment }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)

  return (
    <li className="relative flex gap-3">
      <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <MessageSquare size={12} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5">
        <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
          <span>
            {ago(comment.createdAt)}
            {comment.editedAt && ' · edited'}
          </span>
          {!editing && (
            <span className="flex gap-3">
              <button
                type="button"
                className="hover:text-ink"
                onClick={() => {
                  setDraft(comment.body)
                  setEditing(true)
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="hover:text-danger"
                onClick={async () => {
                  if (await confirmAction({ title: 'Delete this comment?', confirmLabel: 'Delete', danger: true })) deleteComment(comment.id)
                }}
              >
                Delete
              </button>
            </span>
          )}
        </div>
        {editing ? (
          <>
            <textarea className={cls(textarea, 'min-h-20')} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus aria-label="Edit comment" />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className={button.secondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={button.primary}
                disabled={!draft.trim()}
                onClick={async () => {
                  await editComment(comment.id, draft)
                  setEditing(false)
                }}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <Markdown>{comment.body}</Markdown>
        )}
      </div>
    </li>
  )
}
