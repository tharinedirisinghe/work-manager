import { describe, expect, it } from 'vitest'
import { orderBetween } from '../src/lib/order'
import { parseDue, parseQuickAdd } from '../src/lib/quickAddParser'
import { formatClock, formatMinutes, parseDuration, totalMinutes } from '../src/lib/time'

// Thursday 2026-10-01, 10:00 local time
const NOW = new Date(2026, 9, 1, 10, 0, 0)

describe('parseQuickAdd', () => {
  it('extracts priority, labels, due date, estimate and today flag', () => {
    const r = parseQuickAdd('Fix nav !high #portfolio due:fri ~2h @today', NOW)
    expect(r).toEqual({ title: 'Fix nav', priority: 'high', labels: ['portfolio'], dueDate: '2026-10-02', estimateMin: 120, today: true })
  })

  it('keeps unknown tokens in the title', () => {
    const r = parseQuickAdd('Email bob !nope due:someday ~abc', NOW)
    expect(r.title).toBe('Email bob !nope due:someday ~abc')
    expect(r.priority).toBeUndefined()
    expect(r.dueDate).toBeUndefined()
  })

  it('supports priority aliases', () => {
    expect(parseQuickAdd('a !4', NOW).priority).toBe('urgent')
    expect(parseQuickAdd('a !med', NOW).priority).toBe('medium')
  })
})

describe('parseDue', () => {
  it('resolves relative dates', () => {
    expect(parseDue('today', NOW)).toBe('2026-10-01')
    expect(parseDue('tomorrow', NOW)).toBe('2026-10-02')
    expect(parseDue('+3d', NOW)).toBe('2026-10-04')
    expect(parseDue('+1w', NOW)).toBe('2026-10-08')
  })
  it('resolves weekdays to the next occurrence, counting today', () => {
    expect(parseDue('thu', NOW)).toBe('2026-10-01')
    expect(parseDue('monday', NOW)).toBe('2026-10-05')
    expect(parseDue('wed', NOW)).toBe('2026-10-07')
  })
  it('rejects junk', () => {
    expect(parseDue('monkey', NOW)).toBeUndefined()
    expect(parseDue('mo', NOW)).toBeUndefined()
  })
})

describe('time helpers', () => {
  it('parses durations', () => {
    expect(parseDuration('2h')).toBe(120)
    expect(parseDuration('90m')).toBe(90)
    expect(parseDuration('1h30m')).toBe(90)
    expect(parseDuration('1.5h')).toBe(90)
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('')).toBeNull()
  })
  it('formats durations', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(95)).toBe('1h 35m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatClock(3725000)).toBe('1:02:05')
    expect(formatClock(65000)).toBe('1:05')
  })
  it('totals entries, counting a running timer up to now', () => {
    const t0 = 1_000_000
    const entries = [
      { id: 'a', taskId: 't', start: t0, end: t0 + 30 * 60000, note: '' },
      { id: 'b', taskId: 't', start: t0 + 60 * 60000, end: null, note: '' },
    ]
    expect(totalMinutes(entries, t0 + 75 * 60000)).toBe(45)
  })
})

describe('orderBetween', () => {
  it('places items between, before and after neighbours', () => {
    expect(orderBetween()).toBe(1000)
    expect(orderBetween(1000, 2000)).toBe(1500)
    expect(orderBetween(undefined, 1000)).toBe(0)
    expect(orderBetween(1000, undefined)).toBe(2000)
  })
})
