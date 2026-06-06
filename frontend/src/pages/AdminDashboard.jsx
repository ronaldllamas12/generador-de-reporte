import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import api from '../services/api'

const ITEMS_PER_PAGE = 8
const UNDO_TIMEOUT_MS = 6000

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">Página {page} de {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="premium-btn-secondary rounded-xl px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${value === page ? 'premium-btn-primary' : 'premium-btn-secondary'}`}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="premium-btn-secondary rounded-xl px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [machinesPage, setMachinesPage] = useState(1)
  const [areasPage, setAreasPage] = useState(1)
  const [users, setUsers] = useState([])
  const [machines, setMachines] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    item: null,
    title: '',
    description: '',
    impactLines: [],
  })
  const [pendingDeletion, setPendingDeletion] = useState(null)

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false)
  const [showMachineModal, setShowMachineModal] = useState(false)
  const [showAreaModal, setShowAreaModal] = useState(false)

  // Form states
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'employee', is_active: true, area_ids: [] })

  const [selectedMachine, setSelectedMachine] = useState(null)
  const [machineForm, setMachineForm] = useState({ code: '', name: '', description: '', area_id: '', is_active: true })

  const [selectedArea, setSelectedArea] = useState(null)
  const [areaForm, setAreaForm] = useState({ name: '', description: '' })

  // Fetch data
  useEffect(() => {
    loadUsers()
    loadMachines()
    loadAreas()
  }, [])

  useEffect(() => {
    if (!confirmDialog.open) return
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setConfirmDialog((current) => ({ ...current, open: false }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmDialog.open])

  useEffect(() => {
    return () => {
      if (pendingDeletion?.timeoutId) {
        clearTimeout(pendingDeletion.timeoutId)
      }
    }
  }, [pendingDeletion])

  useEffect(() => {
    setUsersPage(1)
    setMachinesPage(1)
    setAreasPage(1)
  }, [searchTerm, activeTab])

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      const data = Array.isArray(response.data) ? response.data : []
      setUsers(data.filter(u => u?.id))
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar usuarios')
    }
  }

  const loadMachines = async () => {
    try {
      const response = await api.get('/admin/machines')
      const data = Array.isArray(response.data) ? response.data : []
      setMachines(data.filter(m => m?.id))
    } catch (error) {
      console.error('Error loading machines:', error)
      toast.error('Error al cargar máquinas')
    }
  }

  const loadAreas = async () => {
    try {
      const response = await api.get('/admin/areas')
      const data = Array.isArray(response.data) ? response.data : []
      setAreas(data.filter(a => a?.id))
    } catch (error) {
      console.error('Error loading areas:', error)
      toast.error('Error al cargar áreas')
    }
  }

  // User handlers
  const openUserModal = (u = null) => {
    if (u) {
      setSelectedUser(u)
      setUserForm({
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        area_ids: Array.isArray(u.areas) ? u.areas.map((area) => area.id) : [],
      })
    } else {
      setSelectedUser(null)
      setUserForm({ full_name: '', email: '', password: '', role: 'employee', is_active: true, area_ids: [] })
    }
    setShowUserModal(true)
  }

  const handleSaveUser = async () => {
    if (!userForm.full_name || !userForm.email) {
      toast.error('Completa todos los campos')
      return
    }

    if (!selectedUser && !userForm.password) {
      toast.error('La contraseña es requerida')
      return
    }

    if (!selectedUser && userForm.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (!userForm.area_ids.length) {
      toast.error('Selecciona al menos un área para el usuario')
      return
    }

    setLoading(true)
    try {
      if (selectedUser) {
        const payload = { ...userForm }
        delete payload.password
        await api.put(`/admin/users/${selectedUser.id}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/admin/users', userForm)
        toast.success('Usuario creado')
      }
      setShowUserModal(false)
      loadUsers()
    } catch (error) {
      const serverError = error.response?.data
      let message = 'Error al guardar usuario'

      if (serverError?.detail) {
        if (Array.isArray(serverError.detail)) {
          message = serverError.detail
            .map((err) => {
              if (err.loc && err.msg) {
                const field = err.loc.slice(1).join('.')
                return `${field}: ${err.msg}`
              }
              return err.msg || JSON.stringify(err)
            })
            .join('; ')
        } else if (typeof serverError.detail === 'string') {
          message = serverError.detail
        } else {
          message = JSON.stringify(serverError.detail)
        }
      }

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = (userItem) => {
    setConfirmDialog({
      open: true,
      type: 'user',
      item: userItem,
      title: 'Eliminar usuario',
      description: 'Se eliminará el usuario del panel de administración.',
      impactLines: [
        `Nombre: ${userItem.full_name}`,
        `Email: ${userItem.email}`,
        'Impacto: no podrá iniciar sesión nuevamente.',
      ],
    })
  }

  const toggleUserArea = (areaId) => {
    setUserForm((current) => {
      const currentAreaIds = Array.isArray(current.area_ids) ? current.area_ids : []
      const area_ids = currentAreaIds.includes(areaId)
        ? currentAreaIds.filter((id) => id !== areaId)
        : [...currentAreaIds, areaId]
      return { ...current, area_ids }
    })
  }

  // Machine handlers
  const openMachineModal = (m = null) => {
    if (m) {
      setSelectedMachine(m)
      setMachineForm({
        code: m.code,
        name: m.name,
        description: m.description || '',
        area_id: m.area_id || '',
        is_active: m.is_active,
      })
    } else {
      setSelectedMachine(null)
      setMachineForm({ code: '', name: '', description: '', area_id: '', is_active: true })
    }
    setShowMachineModal(true)
  }

  const handleSaveMachine = async () => {
    if (!machineForm.code || !machineForm.name) {
      toast.error('Código y nombre son requeridos')
      return
    }

    if (!machineForm.area_id) {
      toast.error('Selecciona un área para la máquina')
      return
    }

    setLoading(true)
    try {
      if (selectedMachine) {
        await api.put(`/admin/machines/${selectedMachine.id}`, machineForm)
        toast.success('Máquina actualizada')
      } else {
        await api.post('/admin/machines', machineForm)
        toast.success('Máquina creada')
      }
      setShowMachineModal(false)
      loadMachines()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar máquina')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMachine = (machineItem) => {
    setConfirmDialog({
      open: true,
      type: 'machine',
      item: machineItem,
      title: 'Eliminar máquina',
      description: 'Se eliminará la máquina de la lista operativa.',
      impactLines: [
        `Código: ${machineItem.code}`,
        `Nombre: ${machineItem.name}`,
        'Impacto: no estará disponible para iniciar turnos.',
      ],
    })
  }

  // Area handlers
  const openAreaModal = (a = null) => {
    if (a) {
      setSelectedArea(a)
      setAreaForm({ name: a.name, description: a.description })
    } else {
      setSelectedArea(null)
      setAreaForm({ name: '', description: '' })
    }
    setShowAreaModal(true)
  }

  const handleSaveArea = async () => {
    if (!areaForm.name) {
      toast.error('El nombre del área es requerido')
      return
    }

    setLoading(true)
    try {
      if (selectedArea) {
        await api.put(`/admin/areas/${selectedArea.id}`, areaForm)
        toast.success('Área actualizada')
      } else {
        await api.post('/admin/areas', areaForm)
        toast.success('Área creada')
      }
      setShowAreaModal(false)
      loadAreas()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar área')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArea = (areaItem) => {
    setConfirmDialog({
      open: true,
      type: 'area',
      item: areaItem,
      title: 'Eliminar área',
      description: 'Se eliminará el área de la configuración del sistema.',
      impactLines: [
        `Nombre: ${areaItem.name}`,
        `Descripción: ${areaItem.description || 'Sin descripción'}`,
        'Impacto: dejará de estar disponible para clasificación.',
      ],
    })
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const areaById = useMemo(
    () => new Map(areas.map((area) => [area.id, area])),
    [areas],
  )
  const getMachineAreaName = (machine) => machine.area?.name || machine.area_name || areaById.get(machine.area_id)?.name || 'Sin área'
  const getUserAreaNames = (item) => (Array.isArray(item.areas) && item.areas.length ? item.areas.map((area) => area.name).join(', ') : 'Sin áreas')

  const filteredUsers = useMemo(
    () => users.filter((u) => {
      if (!normalizedSearch) return true
      return (
        u.full_name?.toLowerCase().includes(normalizedSearch) ||
        u.email?.toLowerCase().includes(normalizedSearch) ||
        u.role?.toLowerCase().includes(normalizedSearch) ||
        getUserAreaNames(u).toLowerCase().includes(normalizedSearch)
      )
    }),
    [users, normalizedSearch],
  )
  const filteredMachines = useMemo(
    () => machines.filter((m) => {
      if (!normalizedSearch) return true
      return (
        m.code?.toLowerCase().includes(normalizedSearch) ||
        m.name?.toLowerCase().includes(normalizedSearch) ||
        (m.description || '').toLowerCase().includes(normalizedSearch) ||
        getMachineAreaName(m).toLowerCase().includes(normalizedSearch)
      )
    }),
    [machines, normalizedSearch, areaById],
  )
  const filteredAreas = useMemo(
    () => areas.filter((a) => {
      if (!normalizedSearch) return true
      return (
        a.name?.toLowerCase().includes(normalizedSearch) ||
        (a.description || '').toLowerCase().includes(normalizedSearch)
      )
    }),
    [areas, normalizedSearch],
  )

  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const machinesTotalPages = Math.max(1, Math.ceil(filteredMachines.length / ITEMS_PER_PAGE))
  const areasTotalPages = Math.max(1, Math.ceil(filteredAreas.length / ITEMS_PER_PAGE))

  const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE)
  const paginatedMachines = filteredMachines.slice((machinesPage - 1) * ITEMS_PER_PAGE, machinesPage * ITEMS_PER_PAGE)
  const paginatedAreas = filteredAreas.slice((areasPage - 1) * ITEMS_PER_PAGE, areasPage * ITEMS_PER_PAGE)

  useEffect(() => {
    if (usersPage > usersTotalPages) setUsersPage(usersTotalPages)
  }, [usersPage, usersTotalPages])

  useEffect(() => {
    if (machinesPage > machinesTotalPages) setMachinesPage(machinesTotalPages)
  }, [machinesPage, machinesTotalPages])

  useEffect(() => {
    if (areasPage > areasTotalPages) setAreasPage(areasTotalPages)
  }, [areasPage, areasTotalPages])

  function applyOptimisticRemoval(type, itemId) {
    if (type === 'user') {
      setUsers((current) => current.filter((item) => item.id !== itemId))
    } else if (type === 'machine') {
      setMachines((current) => current.filter((item) => item.id !== itemId))
    } else if (type === 'area') {
      setAreas((current) => current.filter((item) => item.id !== itemId))
    }
  }

  function restoreDeletedItem(type, item) {
    if (type === 'user') {
      setUsers((current) => [item, ...current])
    } else if (type === 'machine') {
      setMachines((current) => [item, ...current])
    } else if (type === 'area') {
      setAreas((current) => [item, ...current])
    }
  }

  function getDeleteMeta(type) {
    if (type === 'user') {
      return {
        endpoint: (id) => `/admin/users/${id}`,
        successMessage: 'Usuario eliminado',
        errorMessage: 'Error al eliminar usuario',
      }
    }
    if (type === 'machine') {
      return {
        endpoint: (id) => `/admin/machines/${id}`,
        successMessage: 'Máquina eliminada',
        errorMessage: 'Error al eliminar máquina',
      }
    }
    return {
      endpoint: (id) => `/admin/areas/${id}`,
      successMessage: 'Área eliminada',
      errorMessage: 'Error al eliminar área',
    }
  }

  function undoPendingDeletion() {
    if (!pendingDeletion) return
    clearTimeout(pendingDeletion.timeoutId)
    restoreDeletedItem(pendingDeletion.type, pendingDeletion.item)
    setPendingDeletion(null)
    toast.success('Eliminación deshecha')
  }

  function confirmDeletion() {
    if (pendingDeletion) {
      toast.error('Ya hay una eliminación pendiente. Deshazla o espera a que finalice.')
      return
    }

    const { type, item } = confirmDialog
    if (!type || !item?.id) return

    const meta = getDeleteMeta(type)
    applyOptimisticRemoval(type, item.id)

    const timeoutId = setTimeout(async () => {
      try {
        await api.delete(meta.endpoint(item.id))
        toast.success(meta.successMessage)
      } catch (error) {
        restoreDeletedItem(type, item)
        toast.error(meta.errorMessage)
      } finally {
        setPendingDeletion(null)
      }
    }, UNDO_TIMEOUT_MS)

    setPendingDeletion({ type, item, timeoutId })
    setConfirmDialog({ open: false, type: null, item: null, title: '', description: '', impactLines: [] })
    toast.success('Eliminación en cola. Puedes deshacer antes de que finalice.')
  }

  return (
    <div className="premium-shell">
      {/* Header */}
      <div className="premium-nav">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Administración</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard Admin</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="premium-chip rounded-full px-3 py-1.5 text-sm">
              Bienvenido, <strong>{user.full_name}</strong>
            </span>
            <button
              onClick={onLogout}
              className="premium-btn-danger rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200/70 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 py-3">
            {[
              { id: 'users', label: 'Usuarios' },
              { id: 'machines', label: 'Máquinas' },
              { id: 'areas', label: 'Áreas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'premium-btn-primary'
                    : 'premium-btn-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'users'
                ? 'Buscar usuario por nombre, email o rol'
                : activeTab === 'machines'
                  ? 'Buscar máquina por código, nombre o descripción'
                  : 'Buscar área por nombre o descripción'
            }
            className="premium-input h-12 w-full rounded-2xl px-4 text-sm"
          />
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => openUserModal()}
                className="premium-btn-primary rounded-2xl px-4 py-2.5 text-sm font-semibold"
              >
                + Nuevo Usuario
              </button>
            </div>

            <div className="premium-card overflow-x-auto rounded-3xl">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Áreas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getUserAreaNames(u)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm gap-2 flex">
                        <button
                          onClick={() => openUserModal(u)}
                          className="font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="font-semibold text-rose-700 hover:text-rose-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">No hay usuarios que coincidan con la búsqueda.</div>
              ) : null}
            </div>
            <Pagination page={usersPage} totalPages={usersTotalPages} onChange={setUsersPage} />
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => openMachineModal()}
                className="premium-btn-primary rounded-2xl px-4 py-2.5 text-sm font-semibold"
              >
                + Nueva Máquina
              </button>
            </div>

            <div className="premium-card overflow-x-auto rounded-3xl">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedMachines.map((m) => (
                    <tr key={m.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getMachineAreaName(m)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {m.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm gap-2 flex">
                        <button
                          onClick={() => openMachineModal(m)}
                          className="font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(m)}
                          className="font-semibold text-rose-700 hover:text-rose-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMachines.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">No hay máquinas que coincidan con la búsqueda.</div>
              ) : null}
            </div>
            <Pagination page={machinesPage} totalPages={machinesTotalPages} onChange={setMachinesPage} />
          </div>
        )}

        {/* Areas Tab */}
        {activeTab === 'areas' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => openAreaModal()}
                className="premium-btn-primary rounded-2xl px-4 py-2.5 text-sm font-semibold"
              >
                + Nueva Área
              </button>
            </div>

            <div className="premium-card overflow-x-auto rounded-3xl">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedAreas.map((a) => (
                    <tr key={a.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{a.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm gap-2 flex">
                        <button
                          onClick={() => openAreaModal(a)}
                          className="font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteArea(a)}
                          className="font-semibold text-rose-700 hover:text-rose-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAreas.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">No hay áreas que coincidan con la búsqueda.</div>
              ) : null}
            </div>
            <Pagination page={areasPage} totalPages={areasTotalPages} onChange={setAreasPage} />
          </div>
        )}
      </div>

      {pendingDeletion ? (
        <div className="fixed bottom-4 left-1/2 z-[60] w-[95%] max-w-xl -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-900">
              Eliminación pendiente. Puedes deshacer en unos segundos antes de confirmar el cambio.
            </p>
            <button
              type="button"
              onClick={undoPendingDeletion}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Deshacer
            </button>
          </div>
        </div>
      ) : null}

      {confirmDialog.open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            aria-describedby="confirm-delete-description"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <h3 id="confirm-delete-title" className="text-xl font-semibold text-gray-900">
              {confirmDialog.title}
            </h3>
            <p id="confirm-delete-description" className="mt-2 text-sm text-gray-600">
              {confirmDialog.description}
            </p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de impacto</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {confirmDialog.impactLines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Después de confirmar, tendrás una ventana breve para deshacer la acción.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog({ open: false, type: null, item: null, title: '', description: '', impactLines: [] })}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletion}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md rounded-3xl p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">
              {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              {!selectedUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="premium-input h-11 w-full rounded-2xl px-3"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="premium-input h-11 w-full rounded-2xl px-3"
                >
                  <option value="employee">Empleado</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Áreas asignadas
                </label>
                <div className="premium-panel max-h-40 space-y-2 overflow-y-auto rounded-2xl p-3">
                  {areas.length === 0 ? (
                    <p className="text-sm text-gray-500">Crea un área antes de asignar usuarios.</p>
                  ) : (
                    areas.map((area) => (
                      <label key={area.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(userForm.area_ids || []).includes(area.id)}
                          onChange={() => toggleUserArea(area.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span>{area.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="user_active"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="user_active" className="ml-2 text-sm text-gray-700">
                  Activo
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowUserModal(false)}
                className="premium-btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="premium-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine Modal */}
      {showMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md rounded-3xl p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">
              {selectedMachine ? 'Editar Máquina' : 'Nueva Máquina'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={machineForm.code}
                  onChange={(e) => setMachineForm({ ...machineForm, code: e.target.value })}
                  placeholder="REC-10"
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={machineForm.name}
                  onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                  placeholder="Nombre de la máquina"
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <select
                  value={machineForm.area_id}
                  onChange={(e) => setMachineForm({ ...machineForm, area_id: e.target.value })}
                  className="premium-input h-11 w-full rounded-2xl px-3"
                >
                  <option value="">Selecciona un área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={machineForm.description}
                  onChange={(e) => setMachineForm({ ...machineForm, description: e.target.value })}
                  placeholder="Descripción de la máquina"
                  rows="3"
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="machine_active"
                  checked={machineForm.is_active}
                  onChange={(e) => setMachineForm({ ...machineForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="machine_active" className="ml-2 text-sm text-gray-700">
                  Activa
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowMachineModal(false)}
                className="premium-btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMachine}
                disabled={loading}
                className="premium-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md rounded-3xl p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">
              {selectedArea ? 'Editar Área' : 'Nueva Área'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={areaForm.name}
                  onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                  placeholder="Nombre del área"
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={areaForm.description}
                  onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                  placeholder="Descripción del área"
                  rows="3"
                  className="premium-input h-11 w-full rounded-2xl px-3"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowAreaModal(false)}
                className="premium-btn-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveArea}
                disabled={loading}
                className="premium-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


