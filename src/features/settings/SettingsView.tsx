import { CircleCheck, Download, FolderOpen, HardDrive, KeyRound, Palette, Tag, TriangleAlert, Upload, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { confirmAction } from '../../components/ConfirmDialog'
import { ICON, button, card, cls, input, inputAuto } from '../../components/styles'
import { LabelChip } from '../../components/ui'
import { useLabels } from '../../db/hooks'
import { deleteLabel } from '../../db/repo/labels'
import { setSetting, useSetting, type Settings } from '../../db/repo/settings'
import { downloadBackup, folderBackupSupported, importData, pickBackupFolder, requestPersistentStorage, runAutoBackup } from '../../lib/backup'

function Card({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: ReactNode }) {
  return (
    <section className={cls(card, 'p-5')}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-muted">
          <Icon {...ICON} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 text-sm">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-muted">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

type Flash = { tone: 'success' | 'error'; text: string } | null

export function SettingsView() {
  const theme = useSetting('theme')
  const wipLimit = useSetting('wipLimit')
  const apiKey = useSetting('apiKey')
  const backupDir = useSetting('backupDir')
  const lastBackupDate = useSetting('lastBackupDate')
  const labels = useLabels()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const show = (tone: 'success' | 'error', text: string) => {
    setFlash({ tone, text })
    setTimeout(() => setFlash(null), 5000)
  }

  const key = keyDraft ?? apiKey

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      {flash && (
        <p
          role="status"
          className={cls(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            flash.tone === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
        >
          {flash.tone === 'success' ? <CircleCheck {...ICON} /> : <TriangleAlert {...ICON} />}
          {flash.text}
        </p>
      )}

      <Card icon={Palette} title="Appearance and workflow">
        <Row label="Theme">
          <select className={cls(inputAuto, 'pr-7')} value={theme} onChange={(e) => setSetting('theme', e.target.value as Settings['theme'])} aria-label="Theme">
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Row>
        <Row label="In-progress limit" hint="Warns when more tasks than this are in progress. 0 turns it off.">
          <input
            type="number"
            min={0}
            max={20}
            className={cls(inputAuto, 'w-20')}
            value={wipLimit}
            onChange={(e) => setSetting('wipLimit', Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
            aria-label="In-progress limit"
          />
        </Row>
      </Card>

      <Card
        icon={HardDrive}
        title="Your data"
        description="Everything is stored only in this browser on this computer, never on a server. Clearing this site’s data deletes it, so keep backups."
      >
        <Row label="Persistent storage" hint="Stops the browser from clearing your data to free up space.">
          {persisted ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <CircleCheck {...ICON} />
              On
            </span>
          ) : (
            <button type="button" className={button.secondary} onClick={async () => setPersisted(await requestPersistentStorage())}>
              Turn on
            </button>
          )}
        </Row>

        <div className="border-t border-line pt-4">
          <Row
            label="Daily backup to a folder"
            hint={
              !folderBackupSupported()
                ? 'Needs Edge or Chrome. Use export below instead.'
                : backupDir
                  ? `Saving to “${backupDir.name}” · last backup ${lastBackupDate ?? 'never'} · keeps the newest 14`
                  : 'Pick a folder (for example in OneDrive). A backup file is saved there once a day.'
            }
          >
            {folderBackupSupported() && (
              <div className="flex gap-2">
                {backupDir && (
                  <>
                    <button
                      type="button"
                      className={button.secondary}
                      onClick={async () => {
                        const r = await runAutoBackup({ force: true })
                        if (r === 'done') show('success', 'Backup saved.')
                        else show('error', r === 'needs-permission' ? 'Allow folder access using the banner at the top.' : 'Backup failed.')
                      }}
                    >
                      Back up now
                    </button>
                    <button type="button" className={button.icon} onClick={() => setSetting('backupDir', null)} aria-label="Turn off folder backup" title="Turn off">
                      <X {...ICON} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={backupDir ? button.ghost : button.primary}
                  onClick={async () => {
                    try {
                      const name = await pickBackupFolder()
                      if (name) show('success', `Backups will be saved to “${name}”.`)
                    } catch {
                      /* picker cancelled */
                    }
                  }}
                >
                  <FolderOpen {...ICON} />
                  {backupDir ? 'Change' : 'Choose folder'}
                </button>
              </div>
            )}
          </Row>
        </div>

        <div className="border-t border-line pt-4">
          <Row label="Manual backup" hint="Export everything as one JSON file, or restore from one.">
            <div className="flex gap-2">
              <button type="button" className={button.secondary} onClick={downloadBackup}>
                <Download {...ICON} />
                Export
              </button>
              <button type="button" className={button.secondary} onClick={() => fileRef.current?.click()}>
                <Upload {...ICON} />
                Import
              </button>
            </div>
          </Row>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              const ok = await confirmAction({
                title: 'Replace all data with this backup?',
                body: 'Everything currently in Work Manager is replaced by the backup’s contents.',
                confirmLabel: 'Import backup',
                danger: true,
              })
              if (!ok) return
              try {
                await importData(JSON.parse(await file.text()))
                show('success', 'Backup imported.')
              } catch (err) {
                show('error', err instanceof Error ? err.message : 'Import failed.')
              }
            }}
          />
        </div>
      </Card>

      <Card icon={Tag} title="Labels" description="Add labels from a task, or with #label in quick add.">
        {labels.length === 0 ? (
          <p className="text-ink-muted">No labels yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <LabelChip
                key={l.id}
                label={l}
                onRemove={async () => {
                  const ok = await confirmAction({
                    title: `Delete label “${l.name}”?`,
                    body: 'It’s removed from every task that uses it.',
                    confirmLabel: 'Delete label',
                    danger: true,
                  })
                  if (ok) deleteLabel(l.id)
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        icon={KeyRound}
        title="AI report with an API key (optional)"
        description="Not needed: “Analyse with Claude” on the review page works with a free claude.ai account. An Anthropic API key adds one-click reports. The API is billed per use, separately from claude.ai plans. The key stays in this browser and is only sent to Anthropic."
      >
        <div className="flex gap-2">
          <input
            type="password"
            className={input}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKeyDraft(e.target.value)}
            autoComplete="off"
            aria-label="Anthropic API key"
          />
          <button
            type="button"
            className={button.primary}
            disabled={key === apiKey}
            onClick={async () => {
              await setSetting('apiKey', key.trim())
              setKeyDraft(null)
              show('success', key.trim() ? 'API key saved.' : 'API key removed.')
            }}
          >
            Save
          </button>
        </div>
      </Card>
    </div>
  )
}
