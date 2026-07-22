import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { CurrencyProvider } from './context/CurrencyContext.jsx'
import { GymProfileProvider } from './context/GymProfileContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GymProfileProvider>
      <CurrencyProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </CurrencyProvider>
    </GymProfileProvider>
  </React.StrictMode>,
)
