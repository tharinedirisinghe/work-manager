import { describe, expect, it } from 'vitest'
import type { Activity, Project, Task, TimeEntry } from '../src/db/types'
import { generateInsights } from '../src/lib/insights'
import { buildReviewPrompt } from '../src/lib/reviewPrompt'
import { computeWeeklyStats } from '../src/lib/weeklyStats'

const H = 3600000
const D = 24 * H
const weekStart = new Date(2026, 8, 21) // Monday 21 Sep 2026
const ws = weekStart.getTime()
const project: Project = { id: 'p', name: 'Portfolio', key: 'PORT', color: '#000', nextNumber: 9, archived: false, createdAt: ws - 30 * D }

const task = (over: Partial<Task>): Task => ({
  id: 'x',
  projectId: 'p',
  number: 1,
  title: 'Task',
  description: 'secret details',
  status: 'todo',
  priority: 'medium',
  labelIds: [],
  dueDate: null,
  estimateMin: null,
  order: 1000,
  checklist: [],
  plannedFor: null,
  createdAt: ws,
  updatedAt: ws,
  startedAt: null,
  completedAt: null,
  ...over,
})

const tasks: Task[] = [
  task({ id: 'a', number: 1, title: 'Build hero', status: 'done', estimateMin: 60, completedAt: ws + 1 * D + 12 * H }),
  task({ id: 'b', number: 2, title: 'Write about', status: 'done', estimateMin: 60, completedAt: ws + 2 * D + 12 * H }),
  task({ id: 'c', number: 3, title: 'Gallery', status: 'in_progress', startedAt: ws - 3 * D }),
  task({ id: 'd', number: 4, title: 'Fix footer', status: 'todo', dueDate: '2026-09-23' }),
  task({ id: 'e', number: 5, title: 'Old done', status: 'done', completedAt: ws - 2 * D, createdAt: ws - 10 * D }),
]
const entry = (id: string, taskId: string, start: number, minutes: number): TimeEntry => ({
  id,
  taskId,
  start,
  end: start + minutes * 60000,
  note: '',
})
const timeEntries: TimeEntry[] = [
  entry('1', 'a', ws + 1 * D + 9 * H, 90), // Tue morning
  entry('2', 'b', ws + 2 * D + 9 * H, 60), // Wed morning
  entry('3', 'c', ws + 1 * D + 14 * H, 60), // Tue afternoon
  entry('4', 'e', ws - 2 * D + 9 * H, 30), // previous week
]
const activity: Activity[] = [{ id: 'z', taskId: 'c', type: 'status', from: 'todo', to: 'in_progress', at: ws - 3 * D }]

describe('weekly stats', () => {
  const stats = computeWeeklyStats({ projects: [project], tasks, timeEntries, activity, wipLimit: 3 }, weekStart, new Date(ws + 10 * D))

  it('counts completions, time and comparisons', () => {
    expect(stats.weekStart).toBe('2026-09-21')
    expect(stats.weekEnd).toBe('2026-09-27')
    expect(stats.completed.map((t) => t.key)).toEqual(['PORT-1', 'PORT-2'])
    expect(stats.totalMinutes).toBe(210)
    expect(stats.prevCompletedCount).toBe(1)
    expect(stats.prevTotalMinutes).toBe(30)
    expect(stats.minutesByWeekday).toEqual([0, 150, 60, 0, 0, 0, 0])
    expect(stats.minutesByPartOfDay.morning).toBe(150)
    expect(stats.minutesByProject).toEqual([{ project: 'Portfolio', minutes: 210 }])
  })

  it('compares estimates with actual time', () => {
    expect(stats.estimate).toEqual({ tasks: 2, estimatedMin: 120, actualMin: 150 })
  })

  it('finds overdue and stuck tasks', () => {
    expect(stats.overdue.map((t) => t.key)).toEqual(['PORT-4'])
    expect(stats.stuck.map((t) => t.key)).toEqual(['PORT-3'])
    expect(stats.startedCount).toBe(0)
  })

  it('turns stats into insights', () => {
    const text = generateInsights(stats)
      .map((i) => i.text)
      .join('\n')
    expect(text).toContain('Completed 2 tasks (up 100% vs last week)')
    expect(text).toContain('25% longer than estimated')
    expect(text).toContain('PORT-3')
    expect(text).toContain('1 overdue task')
    expect(text).toContain('Most productive: Tuesdays, mostly in the morning')
  })

  it('builds a prompt with stats and titles but no descriptions', () => {
    const prompt = buildReviewPrompt(stats, generateInsights(stats))
    expect(prompt).toContain('2026-09-21')
    expect(prompt).toContain('Build hero')
    expect(prompt).not.toContain('secret details')
  })
})
