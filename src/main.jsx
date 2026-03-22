import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui'
import '@vkontakte/vkui/dist/vkui.css'
import App from './App.jsx'
import './index.css'

// VK Bridge — подключаем только внутри ВКонтакте
try {
  if (window.parent !== window) {
    import('@vkontakte/vk-bridge').then(bridge => {
      bridge.default.send('VKWebAppInit').catch(() => {})
    }).catch(() => {})
  }
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <App />
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  </StrictMode>,
)
