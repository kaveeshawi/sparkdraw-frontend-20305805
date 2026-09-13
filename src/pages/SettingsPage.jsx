import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import useSettingsStore from '@/store/settingsStore'

/** Deep-link: /settings opens the floating Settings modal over the dashboard. */
export default function SettingsPage() {
  const openSettings = useSettingsStore((s) => s.openSettings)

  useEffect(() => {
    openSettings('company')
  }, [openSettings])

  return <Navigate to="/" replace />
}
