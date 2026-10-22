// Must stay the first import: sets <html lang> and installs window.MiravaI18n
// before any component (or its CSS) loads.
import './i18n/runtime.js'
import './i18n/i18n.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { LanguageDock } from './components/LanguageToggle'
import './styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
})

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <LanguageDock />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// In Hindi, wait (briefly) for the catalogue so the first paint is already
// translated instead of flashing English.
const ready = window.MiravaI18n?.ready
if (window.MiravaI18n?.language() === 'hi' && ready) {
  void Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]).then(render)
} else render()
