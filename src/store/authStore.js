import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await authApi.login(email, password)
          const { token, user } = res.data.data
          localStorage.setItem('sparkdraw-token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
          return { success: true, role: user.role }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Invalid email or password'
          return { success: false, message }
        }
      },

      logout: async () => {
        try { await authApi.logout() } catch (_) {}
        localStorage.removeItem('sparkdraw-token')
        localStorage.removeItem('sparkdraw-auth')
        set({ user: null, token: null, isAuthenticated: false })
      },

      loadUser: async () => {
        const token = localStorage.getItem('sparkdraw-token')
        if (!token) return
        try {
          const res = await authApi.me()
          set({ user: res.data.data, isAuthenticated: true })
        } catch (_) {
          localStorage.removeItem('sparkdraw-token')
          localStorage.removeItem('sparkdraw-auth')
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'sparkdraw-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
