import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/index.jsx'
import { AlertProvider } from './components/AlertsComponent'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <AlertProvider>
    <AppProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
    </AlertProvider>
  </StrictMode>,
)
