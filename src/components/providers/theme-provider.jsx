import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useEffect } from 'react'

export function ThemeProvider({ children, ...props }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-preset', 'sparkdraw')
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
