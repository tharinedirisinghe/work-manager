import { create } from 'zustand'

interface UIState {
  openTaskId: string | null
  paletteOpen: boolean
  helpOpen: boolean
  /** Week of a freshly generated review, shown as a banner until dismissed. */
  newReviewWeek: string | null
  backupNeedsPermission: boolean
  openTask: (id: string | null) => void
  setPaletteOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setNewReviewWeek: (week: string | null) => void
  setBackupNeedsPermission: (v: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  openTaskId: null,
  paletteOpen: false,
  helpOpen: false,
  newReviewWeek: null,
  backupNeedsPermission: false,
  openTask: (id) => set({ openTaskId: id }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setNewReviewWeek: (week) => set({ newReviewWeek: week }),
  setBackupNeedsPermission: (v) => set({ backupNeedsPermission: v }),
}))
