import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.35)',
        },
      }}
    />
  </React.StrictMode>,
)
