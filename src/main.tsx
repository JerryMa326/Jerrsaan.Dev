import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './components/ui/toast'

const CielabPlsBeta = lazy(() => import('./beta/CielabPlsBeta'))
const isBeta = window.location.pathname.replace(/\/$/, '') === '/beta/cielab-pls'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <ToastProvider>
        <Suspense fallback={<p role="status">Loading CIELAB + PLS Lab…</p>}>{isBeta ? <CielabPlsBeta /> : <App />}</Suspense>
      </ToastProvider>
    </AppProvider>
  </React.StrictMode>,
)
