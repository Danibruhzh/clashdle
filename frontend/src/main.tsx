import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from "@vercel/analytics/react"
import './index.css'
import App from './App.tsx'
import UnlimitedPage from './UnlimitedPage.tsx'
import NotFoundPage from './NotFoundPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/unlimited" element={<UnlimitedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Analytics />
    </BrowserRouter>

  </StrictMode>,
)
