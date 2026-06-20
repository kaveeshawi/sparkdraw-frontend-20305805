import { create } from 'zustand'
import { projectsApi } from '../services/api'

const useProjectStore = create((set, get) => ({
  projects: [],
  summary: null,
  currentProject: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchProjects: async (force = false) => {
    const { isLoading, lastFetchedAt } = get()
    if (isLoading) return
    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < 30000) return

    set({ isLoading: true, error: null })
    try {
      const res = await projectsApi.index()
      const raw = res.data.data
      const list = Array.isArray(raw) ? raw : (raw?.projects ?? [])
      const summary = Array.isArray(raw) ? null : (raw?.summary ?? null)
      set({
        projects: list,
        summary,
        isLoading: false,
        lastFetchedAt: Date.now(),
      })
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to load projects',
        isLoading: false,
      })
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await projectsApi.show(id)
      set({ currentProject: res.data.data, isLoading: false })
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to load project',
        isLoading: false,
      })
    }
  },

  createProject: async (data) => {
    try {
      const res = await projectsApi.store(data)
      set((state) => ({
        projects: [res.data.data, ...state.projects],
        lastFetchedAt: Date.now(),
      }))
      return { success: true, data: res.data.data }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create project'
      const errors = error.response?.data?.errors || {}
      return { success: false, message, errors }
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  clearError: () => set({ error: null }),
}))

export default useProjectStore
