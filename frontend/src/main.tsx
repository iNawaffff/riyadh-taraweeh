import { StrictMode } from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Initialize Sentry (only in production with valid DSN)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% on error
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <App />
    </DirectionProvider>
  </StrictMode>,
)
