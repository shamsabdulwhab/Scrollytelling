import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

/** Match Vite `base` so client routes stay under e.g. `/Scrollytelling/`. Omit when app is served at `/`. */
const rawBase = import.meta.env.BASE_URL.replace(/\/$/, '')
const routerBasename = rawBase && rawBase !== '/' ? rawBase : undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
