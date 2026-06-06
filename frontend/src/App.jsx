import { useEffect, useState } from 'react'
import AdminDashboard from './pages/AdminDashboard'
import InicioTurnoPage from './pages/InicioTurnoPage'
import LoginPage from './pages/LoginPage'

// Force Vite HMR

const PAGE_STORAGE_KEY = 'currentPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('login')
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const storedPage = localStorage.getItem(PAGE_STORAGE_KEY)

        setUser(parsedUser)
        if (storedPage === 'admin' && parsedUser.role === 'admin') {
          setCurrentPage('admin')
        } else {
          setCurrentPage('shifts')
        }
        // Token will be added by interceptor
      } catch (e) {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem(PAGE_STORAGE_KEY)
      }
    }

    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setCurrentPage('shifts')
    localStorage.setItem(PAGE_STORAGE_KEY, 'shifts')
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem(PAGE_STORAGE_KEY)
    localStorage.removeItem('turnoDashboardState')
    setUser(null)
    setCurrentPage('login')
  }

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage)
    localStorage.setItem(PAGE_STORAGE_KEY, nextPage)
  }

  if (loading) {
    return (
      <div className="premium-shell flex items-center justify-center">
        <div className="premium-card rounded-2xl px-5 py-4 text-sm font-semibold text-slate-600">Cargando...</div>
      </div>
    )
  }

  // Not logged in - show login page
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  // Logged in - show navigation between pages
  return (
    <div className="premium-shell">
      {/* Page Navigation */}
      <div className="premium-nav sticky top-0 z-30 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <h1 className="font-semibold tracking-tight text-slate-950">Sistema de Reportes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="premium-chip rounded-full px-3 py-1 text-sm">Bienvenido, {user.full_name}</span>
          <button
            onClick={() => handlePageChange('shifts')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currentPage === 'shifts' ? 'premium-btn-primary' : 'premium-btn-secondary'}`}
          >
            Turnos
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => handlePageChange('admin')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currentPage === 'admin' ? 'premium-btn-primary' : 'premium-btn-secondary'}`}
            >
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="premium-btn-danger rounded-full px-4 py-2 text-sm font-semibold"
          >
            Cerrar Sesión
          </button>
        </div>
        </div>
      </div>

      {/* Pages */}
      {currentPage === 'shifts' && <InicioTurnoPage />}
      {currentPage === 'admin' && (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

