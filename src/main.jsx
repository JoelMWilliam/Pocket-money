import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (err) {
  document.getElementById('root').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff453a;font-family:system-ui,sans-serif;padding:24px;text-align:center;">
      <div>
        <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Failed to start Pocket Money</p>
        <p style="font-size:13px;opacity:0.8;word-break:break-word;">${err.message || 'Unknown error'}</p>
      </div>
    </div>
  `
  console.error(err)
}
