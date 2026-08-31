import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyStoredThemeOnBoot } from './features/theme/theme'

// TASK-019 (ADR-007): aplica uma preferência de tema já salva antes do
// primeiro paint — evita o flash do tema errado (CA-02). Sem preferência
// salva, não faz nada (a aplicação segue `prefers-color-scheme`, RN-02).
applyStoredThemeOnBoot()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
