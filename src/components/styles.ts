export const cls = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/** Icon sizing: 16px in dense UI, 18px in navigation. One stroke width everywhere. */
export const ICON = { size: 16, strokeWidth: 1.75 } as const
export const NAV_ICON = { size: 18, strokeWidth: 1.75 } as const

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 select-none'

export const button = {
  primary: cls(base, 'h-8 px-3 bg-accent text-on-accent hover:bg-accent-hover'),
  secondary: cls(base, 'h-8 px-3 border border-line bg-surface text-ink hover:bg-subtle hover:border-line-strong'),
  ghost: cls(base, 'h-8 px-2.5 text-ink-muted hover:bg-subtle hover:text-ink'),
  danger: cls(base, 'h-8 px-3 bg-danger text-surface hover:opacity-90'),
  dangerGhost: cls(base, 'h-8 px-2.5 text-danger hover:bg-danger-soft'),
  icon: cls(base, 'h-8 w-8 text-ink-muted hover:bg-subtle hover:text-ink'),
}

/** Input without a width, for controls that size to their content (selects, small numbers). */
export const inputAuto =
  'h-8 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent/15'

export const input = cls(inputAuto, 'w-full')

export const textarea =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent/15'

export const card = 'rounded-xl border border-line bg-surface shadow-card'

/** Small section heading used throughout panels. */
export const sectionTitle = 'text-[13px] font-semibold text-ink'

/** Muted, desaturated colors for projects and labels. Identity is always paired with a name. */
export const ENTITY_COLORS = ['#5b8a84', '#6a86a8', '#8c7aa8', '#b0806a', '#b0955a', '#7f9b6c', '#a86f82', '#7c8590']

/** Soft tinted background for a label/project color that works in light and dark themes. */
export const tint = (color: string, pct = 16) => `color-mix(in oklab, ${color} ${pct}%, transparent)`
