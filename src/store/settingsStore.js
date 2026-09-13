import { create } from 'zustand'

const useSettingsStore = create((set) => ({
  open: false,
  section: 'company',
  openSettings: (section = 'company') => set({ open: true, section }),
  closeSettings: () => set({ open: false }),
  setSection: (section) => set({ section }),
}))

export default useSettingsStore
