const GAP = 1000

/** Returns a sort value that falls between two neighbours (either may be missing). */
export function orderBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}
