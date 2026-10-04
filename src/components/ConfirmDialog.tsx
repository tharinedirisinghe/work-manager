import { create } from 'zustand'
import { Modal } from './ui'
import { button } from './styles'

interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
}

const useConfirmStore = create<ConfirmState>(() => ({ request: null }))

/** Themed replacement for window.confirm(). Resolves true when confirmed. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ request: { ...options, resolve } }))
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request)
  const close = (ok: boolean) => {
    request?.resolve(ok)
    useConfirmStore.setState({ request: null })
  }
  return (
    <Modal open={!!request} onClose={() => close(false)} title={request?.title ?? ''}>
      {request?.body && <p className="mb-5 text-sm text-ink-muted">{request.body}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={button.secondary} onClick={() => close(false)}>
          Cancel
        </button>
        <button type="button" autoFocus className={request?.danger ? button.danger : button.primary} onClick={() => close(true)}>
          {request?.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}
