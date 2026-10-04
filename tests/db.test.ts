import { beforeEach, describe, expect, it } from 'vitest'
import { addComment } from '../src/db/repo/comments'
import { createProject, deleteProject } from '../src/db/repo/projects'
import { createTask, modifyTask, updateTask } from '../src/db/repo/tasks'
import { getRunningEntry, startTimer, stopTimer } from '../src/db/repo/time'
import { db } from '../src/db/schema'
import { exportData, importData } from '../src/lib/backup'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('tasks repository', () => {
  it('numbers tasks per project and logs creation', async () => {
    const pid = await createProject('My Portfolio Web')
    const a = await createTask({ projectId: pid, title: 'First' })
    const b = await createTask({ projectId: pid, title: 'Second' })
    const [ta, tb] = [await db.tasks.get(a), await db.tasks.get(b)]
    expect((await db.projects.get(pid))?.key).toBe('MPW')
    expect([ta?.number, tb?.number]).toEqual([1, 2])
    expect(tb!.order).toBeGreaterThan(ta!.order)
    expect(await db.activity.where('taskId').equals(a).count()).toBe(1)
  })

  it('records status changes, started/completed times, and stops the timer on done', async () => {
    const pid = await createProject('P')
    const id = await createTask({ projectId: pid, title: 'T' })
    await updateTask(id, { status: 'in_progress' })
    await startTimer(id)
    expect(await getRunningEntry()).toBeTruthy()
    await updateTask(id, { status: 'done', priority: 'high' })

    const task = await db.tasks.get(id)
    expect(task?.startedAt).toBeTypeOf('number')
    expect(task?.completedAt).toBeTypeOf('number')
    expect(await getRunningEntry()).toBeUndefined()

    const types = (await db.activity.where('taskId').equals(id).toArray()).map((a) => `${a.type}:${a.to ?? ''}`)
    expect(types.sort()).toEqual(['created:', 'priority:high', 'status:done', 'status:in_progress'])

    await updateTask(id, { status: 'todo' })
    expect((await db.tasks.get(id))?.completedAt).toBeNull()
  })

  it('keeps every checklist item when several are added at once', async () => {
    const pid = await createProject('P')
    const id = await createTask({ projectId: pid, title: 'T' })
    await Promise.all(
      ['a', 'b', 'c'].map((text) => modifyTask(id, (t) => ({ checklist: [...t.checklist, { id: text, text, done: false }] }))),
    )
    expect((await db.tasks.get(id))?.checklist.map((c) => c.text).sort()).toEqual(['a', 'b', 'c'])
  })

  it('runs only one timer at a time', async () => {
    const pid = await createProject('P')
    const a = await createTask({ projectId: pid, title: 'A' })
    const b = await createTask({ projectId: pid, title: 'B' })
    await startTimer(a)
    await startTimer(b)
    const running = await db.timeEntries.filter((e) => e.end === null).toArray()
    expect(running.map((e) => e.taskId)).toEqual([b])
    await stopTimer()
    expect(await getRunningEntry()).toBeUndefined()
  })

  it('deletes a project with its tasks, comments and entries', async () => {
    const pid = await createProject('P')
    const id = await createTask({ projectId: pid, title: 'T' })
    await addComment(id, 'hello')
    await startTimer(id)
    await deleteProject(pid)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.comments.count()).toBe(0)
    expect(await db.timeEntries.count()).toBe(0)
    expect(await db.activity.count()).toBe(0)
  })
})

describe('backup', () => {
  it('round-trips all data through export and import', async () => {
    const pid = await createProject('P')
    const id = await createTask({ projectId: pid, title: 'T', estimateMin: 30 })
    await addComment(id, 'note')
    const backup = JSON.parse(JSON.stringify(await exportData()))

    await Promise.all(db.tables.map((t) => t.clear()))
    await importData(backup)

    expect((await db.tasks.get(id))?.estimateMin).toBe(30)
    expect(await db.comments.count()).toBe(1)
    expect(await db.projects.count()).toBe(1)
  })

  it('rejects files that are not backups', async () => {
    await expect(importData({ hello: 'world' })).rejects.toThrow('not a Work Manager backup')
  })
})
