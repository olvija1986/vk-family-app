import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui'
import '@vkontakte/vkui/dist/vkui.css'
import bridge from '@vkontakte/vk-bridge'
import App from './App.jsx'
import './index.css'

bridge.send('VKWebAppInit')

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
