import { useState } from 'react'
import { toast } from 'react-hot-toast'
import api from '../services/api'

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const showDemoCredentials = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true'

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })

      const { access_token, user } = response.data

      // Store token and user in localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))

      toast.success('¡Bienvenido!')
      onLoginSuccess(user)
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="premium-shell flex items-center justify-center p-4">
      <div className="premium-card w-full max-w-md rounded-3xl p-8">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white shadow-lg shadow-slate-300">
          SR
        </div>
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-slate-950">
          Sistema de Reportes
        </h1>
        <p className="mb-8 text-center text-sm leading-6 text-slate-500">
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              className="premium-input h-12 w-full rounded-2xl px-4"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="premium-input h-12 w-full rounded-2xl px-4"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-btn-primary h-12 w-full rounded-2xl px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {showDemoCredentials ? (
          <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Credenciales de demostración:
            </p>
            <p className="text-xs text-slate-600">
              <strong>Email:</strong> ronald.llamas@example.com
            </p>
            <p className="text-xs text-slate-600">
              <strong>Contraseña:</strong> password123
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
