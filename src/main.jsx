import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import bridge from '@vkontakte/vk-bridge'
import App from './App.jsx'
import './index.css'

// Инициализация VK Bridge — вызываем СРАЗУ (синхронно) до рендера
// VK показывает свой loading-экран пока не получит VKWebAppInit
try {
  bridge.send('VKWebAppInit').catch(() => {})
} catch (e) {
  // Вне VK — просто игнорируем
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
