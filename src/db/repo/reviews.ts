import { addDays } from 'date-fns'
import { generateInsights } from '../../lib/insights'
import { computeWeeklyStats, isoDate, weekStartOf } from '../../lib/weeklyStats'
import { db } from '../schema'
import type { Review } from '../types'
import { getSetting } from './settings'

async function loadInput() {
  const [projects, tasks, timeEntries, activity, wipLimit] = await Promise.all([
    db.projects.toArray(),
    db.tasks.toArray(),
    db.timeEntries.toArray(),
    db.activity.toArray(),
    getSetting('wipLimit'),
  ])
  return { projects, tasks, timeEntries, activity, wipLimit }
}

/** Builds a review for the week starting at `weekStart` without saving it. */
export async function buildReview(weekStart: Date): Promise<Review> {
  const stats = computeWeeklyStats(await loadInput(), weekStart)
  return { weekStart: stats.weekStart, createdAt: Date.now(), stats, insights: generateInsights(stats), aiReport: null }
}

/** Generates and saves a review, keeping any AI report already saved for that week. */
export async function saveReview(weekStart: Date): Promise<Review> {
  const review = await buildReview(weekStart)
  const existing = await db.reviews.get(review.weekStart)
  review.aiReport = existing?.aiReport ?? null
  await db.reviews.put(review)
  return review
}

/**
 * Generates last week's review if it doesn't exist yet and there was work before this week.
 * Returns the new review's weekStart, or null if nothing was generated.
 */
export async function ensureLastWeekReview(now = new Date()): Promise<string | null> {
  const thisWeek = weekStartOf(now)
  const lastWeek = addDays(thisWeek, -7)
  if (await db.reviews.get(isoDate(lastWeek))) return null
  const hadWork = await db.tasks.filter((t) => t.createdAt < thisWeek.getTime()).first()
  if (!hadWork) return null
  const review = await saveReview(lastWeek)
  return review.weekStart
}

export function setAiReport(weekStart: string, aiReport: string | null) {
  return db.reviews.update(weekStart, { aiReport })
}
