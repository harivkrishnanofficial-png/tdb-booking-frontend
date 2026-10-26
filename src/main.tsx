import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './common/styles/Global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('The root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
