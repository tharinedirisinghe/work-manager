import { addDays, format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CircleCheck, ClipboardPaste, ExternalLink, FileSearch, Lightbulb, Plus, Sparkles, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { confirmAction } from '../../components/ConfirmDialog'
import { ICON, button, card, cls, sectionTitle, textarea } from '../../components/styles'
import { EmptyState, Markdown } from '../../components/ui'
import { useReviews } from '../../db/hooks'
import { buildReview, saveReview, setAiReport } from '../../db/repo/reviews'
import { useSetting } from '../../db/repo/settings'
import type { Insight, Review } from '../../db/types'
import { generateAiReport } from '../../lib/aiReport'
import { formatDue } from '../../lib/dates'
import { buildReviewPrompt } from '../../lib/reviewPrompt'
import { formatMinutes } from '../../lib/time'
import { isoDate, weekStartOf } from '../../lib/weeklyStats'
import { useUI } from '../../store/ui'

const CURRENT = 'current'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const weekLabel = (weekStart: string) => {
  const start = parseISO(weekStart)
  return `${format(start, 'd MMM')} – ${format(addDays(start, 6), 'd MMM yyyy')}`
}

export function WeeklyReview() {
  const reviews = useReviews()
  const [params, setParams] = useSearchParams()
  const setNewReviewWeek = useUI((s) => s.setNewReviewWeek)
  const selected = params.get('week') ?? CURRENT
  const [thisWeek] = useState(() => weekStartOf(new Date()))
  const lastWeekIso = isoDate(addDays(thisWeek, -7))

  // The current week is computed live and only saved when you add an AI report.
  const current = useLiveQuery(() => buildReview(thisWeek), [thisWeek.getTime()])
  const currentSaved = reviews.find((r) => r.weekStart === isoDate(thisWeek))
  const review =
    selected === CURRENT ? current && { ...current, aiReport: currentSaved?.aiReport ?? null } : reviews.find((r) => r.weekStart === selected)

  const select = (week: string) => {
    setParams(week === CURRENT ? {} : { week }, { replace: true })
    setNewReviewWeek(null)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
      <aside className="shrink-0 lg:w-56">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink">Weekly review</h1>
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
          <WeekItem active={selected === CURRENT} onClick={() => select(CURRENT)} title="This week so far" sub={weekLabel(isoDate(thisWeek))} />
          {reviews
            .filter((r) => r.weekStart !== isoDate(thisWeek))
            .map((r) => (
              <WeekItem
                key={r.weekStart}
                active={selected === r.weekStart}
                onClick={() => select(r.weekStart)}
                title={weekLabel(r.weekStart)}
                sub={`${r.stats.completed.length} done · ${formatMinutes(r.stats.totalMinutes)}`}
                ai={!!r.aiReport}
              />
            ))}
        </ul>
        {!reviews.some((r) => r.weekStart === lastWeekIso) && (
          <button type="button" className={cls(button.ghost, 'mt-2 text-xs!')} onClick={async () => select((await saveReview(addDays(thisWeek, -7))).weekStart)}>
            <Plus size={14} />
            Create last week’s review
          </button>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {!review ? (
          selected === CURRENT ? null : <EmptyState icon={FileSearch} title="Review not found" />
        ) : (
          <ReviewBody review={review} isCurrent={selected === CURRENT} currentSaved={!!currentSaved} />
        )}
      </div>
    </div>
  )
}

function WeekItem({ active, onClick, title, sub, ai }: { active: boolean; onClick: () => void; title: string; sub: string; ai?: boolean }) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cls(
          'w-full rounded-lg px-3 py-2 text-left transition-colors',
          active ? 'bg-surface shadow-card ring-1 ring-line' : 'hover:bg-subtle',
        )}
      >
        <div className={cls('text-sm font-medium', active ? 'text-ink' : 'text-ink-muted')}>{title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
          {sub}
          {ai && <Sparkles size={12} className="text-accent" aria-label="Has AI report" />}
        </div>
      </button>
    </li>
  )
}

const INSIGHT_STYLE: Record<Insight['kind'], { icon: LucideIcon; label: string; tone: string }> = {
  win: { icon: CircleCheck, label: 'Win', tone: 'text-success' },
  warn: { icon: TriangleAlert, label: 'Watch out', tone: 'text-warning' },
  tip: { icon: Lightbulb, label: 'Suggestion', tone: 'text-accent' },
}

function ReviewBody({ review, isCurrent, currentSaved }: { review: Review; isCurrent: boolean; currentSaved: boolean }) {
  const s = review.stats
  const done = s.completed.length
  const delta = (now: number, prev: number, fmt: (n: number) => string) =>
    prev === 0 ? undefined : `${now >= prev ? '+' : '−'}${fmt(Math.abs(now - prev))} vs last week`

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">{weekLabel(review.weekStart)}</h2>
        {isCurrent && <p className="mt-0.5 text-sm text-ink-muted">This week is still in progress. The full review is created automatically next Monday.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Completed" value={String(done)} sub={delta(done, s.prevCompletedCount, String)} />
        <Stat label="Time tracked" value={formatMinutes(s.totalMinutes)} sub={delta(s.totalMinutes, s.prevTotalMinutes, formatMinutes)} />
        <Stat label="Started" value={String(s.startedCount)} sub={`${s.inProgressCount} in progress now`} />
        <Stat
          label="Actual vs estimate"
          value={s.estimate ? `${Math.round((s.estimate.actualMin / s.estimate.estimatedMin) * 100)}%` : '—'}
          sub={s.estimate ? `across ${s.estimate.tasks} task${s.estimate.tasks === 1 ? '' : 's'}` : 'No finished tasks with estimates'}
        />
      </div>

      <section>
        <h3 className={heading}>Insights</h3>
        <ul className={cls(card, 'divide-y divide-line')}>
          {review.insights.map((i, idx) => {
            const st = INSIGHT_STYLE[i.kind]
            return (
              <li key={idx} className="flex items-start gap-3 px-4 py-3 text-sm">
                <st.icon {...ICON} className={cls('mt-0.5 shrink-0', st.tone)} aria-label={st.label} />
                <span className="text-ink">{i.text}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {s.totalMinutes > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Bars title="Time by weekday" rows={WEEKDAYS.map((d, i) => ({ label: d, value: s.minutesByWeekday[i] }))} />
          <Bars title="Time by project" rows={s.minutesByProject.map((p) => ({ label: p.project, value: p.minutes }))} />
        </div>
      )}

      {done > 0 && (
        <section>
          <h3 className={heading}>Completed</h3>
          <ul className={cls(card, 'divide-y divide-line text-sm')}>
            {s.completed.map((t) => (
              <li key={t.key} className="flex items-center gap-3 px-4 py-2.5">
                <CircleCheck {...ICON} className="shrink-0 text-success" />
                <span className="w-16 shrink-0 text-xs font-medium tabular-nums text-ink-muted">{t.key}</span>
                <span className="flex-1 truncate text-ink">{t.title}</span>
                <span className="text-xs tabular-nums text-ink-muted">
                  {formatMinutes(t.actualMin)}
                  {t.estimateMin ? ` of ${formatMinutes(t.estimateMin)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(s.stuck.length > 0 || s.overdue.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {s.stuck.length > 0 && <MiniList title="Stuck for over 5 days" items={s.stuck.map((t) => [t.key, t.title, `${t.days} days`])} />}
          {s.overdue.length > 0 && <MiniList title="Overdue" items={s.overdue.map((t) => [t.key, t.title, formatDue(t.dueDate)])} />}
        </section>
      )}

      <AiSection review={review} needsSave={isCurrent && !currentSaved} />
    </div>
  )
}

const heading = cls(sectionTitle, 'mb-3')

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cls(card, 'p-4')}>
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className={cls(card, 'p-4')}>
      <h3 className={heading}>{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="group flex items-center gap-3 text-xs" title={`${r.label}: ${formatMinutes(r.value)}`}>
            <span className="w-20 shrink-0 truncate text-ink-muted">{r.label}</span>
            <span className="relative h-2.5 flex-1 rounded-full bg-subtle">
              {r.value > 0 && (
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-accent/80 transition-colors group-hover:bg-accent"
                  style={{ width: `max(${(r.value / max) * 100}%, 6px)` }}
                />
              )}
            </span>
            <span className="w-14 shrink-0 text-right tabular-nums text-ink-muted">{r.value > 0 ? formatMinutes(r.value) : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MiniList({ title, items }: { title: string; items: [string, string, string][] }) {
  return (
    <div className={cls(card, 'p-4')}>
      <h3 className={cls(sectionTitle, 'mb-2 flex items-center gap-2')}>
        <TriangleAlert {...ICON} className="text-warning" />
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map(([key, name, meta]) => (
          <li key={key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs font-medium tabular-nums text-ink-muted">{key}</span>
            <span className="flex-1 truncate text-ink">{name}</span>
            <span className="shrink-0 text-xs text-ink-muted">{meta}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AiSection({ review, needsSave }: { review: Review; needsSave: boolean }) {
  const apiKey = useSetting('apiKey')
  const [pasting, setPasting] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const persist = async (text: string | null) => {
    if (needsSave) await saveReview(parseISO(review.weekStart))
    await setAiReport(review.weekStart, text)
  }

  const prompt = buildReviewPrompt(review.stats, review.insights)

  const analyseWithClaude = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      setCopied(false)
    }
    window.open('https://claude.ai/new', '_blank', 'noopener')
    setPasting(true)
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      await persist(await generateAiReport(apiKey, prompt))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cls(card, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-accent-soft/50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
            <Sparkles {...ICON} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">AI report</h3>
            <p className="text-xs text-ink-muted">A written summary with suggestions for next week</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {apiKey && (
            <button type="button" className={button.secondary} onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate with API key'}
            </button>
          )}
          <button type="button" className={button.primary} onClick={analyseWithClaude}>
            <ExternalLink {...ICON} />
            Analyse with Claude
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {!review.aiReport && !pasting && (
          <p className="text-sm text-ink-muted">
            <b className="font-medium text-ink">Analyse with Claude</b> copies this week’s summary (stats and task titles only, never descriptions or
            comments) and opens claude.ai, which works on the free plan. Paste it there, then paste Claude’s reply back here to keep it with this review.
          </p>
        )}

        {pasting && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <ClipboardPaste {...ICON} className="text-accent" />
              {copied ? 'Prompt copied. Paste it into claude.ai, then paste the reply below.' : "Couldn't copy automatically. Copy the prompt below into claude.ai, then paste the reply."}
            </p>
            {!copied && <textarea readOnly className={cls(textarea, 'h-24 font-mono text-[11px]')} value={prompt} onFocus={(e) => e.target.select()} />}
            <textarea
              autoFocus
              className={cls(textarea, 'min-h-32')}
              placeholder="Paste Claude’s report here"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="AI report"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={button.secondary} onClick={() => setPasting(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={button.primary}
                disabled={!draft.trim()}
                onClick={async () => {
                  await persist(draft.trim())
                  setDraft('')
                  setPasting(false)
                }}
              >
                Save report
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 flex items-center gap-2 text-sm text-danger">
            <TriangleAlert {...ICON} />
            {error}
          </p>
        )}

        {review.aiReport && !pasting && (
          <>
            <Markdown>{review.aiReport}</Markdown>
            <button
              type="button"
              className={cls(button.ghost, 'mt-3 -ml-2.5 text-xs!')}
              onClick={async () => {
                if (await confirmAction({ title: 'Remove this AI report?', confirmLabel: 'Remove', danger: true })) persist(null)
              }}
            >
              <Trash2 size={14} />
              Remove report
            </button>
          </>
        )}
      </div>
    </section>
  )
}
