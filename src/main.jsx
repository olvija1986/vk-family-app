import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import * as bridge from '@vkontakte/vk-bridge'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Критическая ошибка рендера:', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-error">
          <h1>Что-то пошло не так</h1>
          <p>Приложение столкнулось с ошибкой. Попробуйте перезагрузить страницу.</p>
          <button onClick={this.handleReload}>Перезагрузить</button>
        </div>
      )
    }

    return this.props.children
  }
}

bridge.send('VKWebAppInit').catch((err) => {
  console.warn('VKWebAppInit недоступен вне VK-контекста:', err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
