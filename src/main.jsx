import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </StrictMode>,
)
