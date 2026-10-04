import { useEffect } from 'react'
import { ensureLastWeekReview } from '../db/repo/reviews'
import { useSetting } from '../db/repo/settings'
import { requestPersistentStorage, runAutoBackup } from '../lib/backup'
import { useUI } from '../store/ui'

const HOUR = 3600000

/** Applies the theme and runs startup jobs: persistent storage, last week's review, daily backup. */
export function useAppBoot() {
  const theme = useSetting('theme')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      try {
        localStorage.setItem('wm-theme', theme)
      } catch {
        /* storage unavailable */
      }
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const { setNewReviewWeek, setBackupNeedsPermission } = useUI.getState()
    const backup = async () => setBackupNeedsPermission((await runAutoBackup()) === 'needs-permission')
    const review = async () => {
      const week = await ensureLastWeekReview()
      if (week) setNewReviewWeek(week)
    }

    requestPersistentStorage()
    review()
    backup()
    // The app may stay open for days; check again every hour.
    const id = setInterval(() => {
      review()
      backup()
    }, HOUR)
    return () => clearInterval(id)
  }, [])
}
