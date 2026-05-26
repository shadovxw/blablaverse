import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router'
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>

        <App />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
