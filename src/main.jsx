import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// VK Bridge — динамический импорт, чтобы не блокировать рендер вне VK
import('@vkontakte/vk-bridge')
  .then(({ default: bridge }) => bridge.send('VKWebAppInit').catch(() => {}))
  .catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
