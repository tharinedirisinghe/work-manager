import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { confirmAction } from '../../components/ConfirmDialog'
import { ICON, button, cls, input } from '../../components/styles'
import { Modal } from '../../components/ui'
import { PROJECT_COLORS, createProject, deleteProject, deriveKey, updateProject } from '../../db/repo/projects'
import type { Project } from '../../db/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Edit this project; create a new one when omitted. */
  project?: Project
  onCreated?: (id: string) => void
  onDeleted?: () => void
}

export function ProjectDialog(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.project ? 'Edit project' : 'New project'}>
      {/* Remounting the form on open resets its fields from the current project. */}
      {props.open && <ProjectForm key={props.project?.id ?? 'new'} {...props} />}
    </Modal>
  )
}

const fieldLabel = 'block text-xs font-medium text-ink-muted'

function ProjectForm({ onClose, project, onCreated, onDeleted }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [key, setKey] = useState(project?.key ?? '')
  const [keyTouched, setKeyTouched] = useState(!!project)
  const [color, setColor] = useState(() => project?.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])

  const effectiveKey = (keyTouched ? key : deriveKey(name)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

  const save = async () => {
    if (!name.trim() || !effectiveKey) return
    if (project) {
      await updateProject(project.id, { name: name.trim(), key: effectiveKey, color })
    } else {
      onCreated?.(await createProject(name, effectiveKey, color))
    }
    onClose()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <label className={fieldLabel}>
        Name
        <input autoFocus className={cls(input, 'mt-1.5')} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Portfolio website" />
      </label>
      <label className={fieldLabel}>
        Key
        <input
          className={cls(input, 'mt-1.5 uppercase')}
          value={keyTouched ? key : effectiveKey}
          onChange={(e) => {
            setKeyTouched(true)
            setKey(e.target.value)
          }}
        />
        <span className="mt-1 block font-normal">Prefix for task IDs, like {effectiveKey || 'KEY'}-12.</span>
      </label>
      <fieldset>
        <legend className={fieldLabel}>Color</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            >
              {color === c && <Check size={14} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between border-t border-line pt-4">
        <div className="flex gap-1">
          {project && (
            <>
              <button
                type="button"
                className={button.icon}
                title={project.archived ? 'Unarchive' : 'Archive'}
                aria-label={project.archived ? 'Unarchive project' : 'Archive project'}
                onClick={async () => {
                  await updateProject(project.id, { archived: !project.archived })
                  onClose()
                }}
              >
                {project.archived ? <ArchiveRestore {...ICON} /> : <Archive {...ICON} />}
              </button>
              <button
                type="button"
                className={cls(button.icon, 'hover:bg-danger-soft hover:text-danger')}
                title="Delete project"
                aria-label="Delete project"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: `Delete “${project.name}”?`,
                    body: 'All its tasks, time entries and comments are deleted too. This can’t be undone.',
                    confirmLabel: 'Delete project',
                    danger: true,
                  })
                  if (!ok) return
                  onClose()
                  onDeleted?.()
                  await deleteProject(project.id)
                }}
              >
                <Trash2 {...ICON} />
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className={button.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={button.primary} disabled={!name.trim()}>
            {project ? 'Save' : 'Create project'}
          </button>
        </div>
      </div>
    </form>
  )
}
