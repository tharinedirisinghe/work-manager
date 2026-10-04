import type { Insight, WeeklyStats } from '../db/types'

/** Builds the prompt for an AI weekly report. Only stats and task titles are included. */
export function buildReviewPrompt(stats: WeeklyStats, insights: Insight[]): string {
  return `You are my productivity coach. Below is data from my personal task manager for the week ${stats.weekStart} to ${stats.weekEnd}.

Write a short weekly report (under 250 words) in Markdown with these sections:
1. **Wins**: what went well.
2. **What slipped**: overdue, stuck or unfinished work.
3. **Patterns**: what the data says about how I work (estimates, time of day, focus across projects).
4. **3 improvements for next week**: concrete and specific to this data.

Be direct and practical. Don't repeat raw numbers unless they support a point.

Rule-based observations already found:
${insights.map((i) => `- [${i.kind}] ${i.text}`).join('\n') || '- none'}

Week data (JSON; minutes for durations, weekdays Monday..Sunday):
\`\`\`json
${JSON.stringify(stats, null, 2)}
\`\`\``
}
