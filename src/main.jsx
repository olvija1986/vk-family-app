import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Инициализация VK Bridge (только внутри VK)
try {
  import('@vkontakte/vk-bridge').then(({ default: bridge }) => {
    bridge.send('VKWebAppInit').catch(() => {})
  }).catch(() => {})
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
