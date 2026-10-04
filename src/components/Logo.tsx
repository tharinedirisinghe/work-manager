/**
 * Work Manager mark: three cards stepping up and to the right, fading in as they move
 * from backlog to done. Kept in sync with public/favicon.svg and scripts/make-icons.mjs.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#2F5F58" />
      <rect x="13" y="33" width="18" height="18" rx="5" fill="#fff" opacity=".35" />
      <rect x="23" y="23" width="18" height="18" rx="5" fill="#fff" opacity=".6" />
      <rect x="33" y="13" width="18" height="18" rx="5" fill="#fff" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">Work Manager</span>
    </span>
  )
}
