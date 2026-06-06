import { AlertTriangle, ArrowLeft, ChevronDown, Factory, FileText, Loader2, PencilLine, PlayCircle, PlusCircle, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createEventMultipart } from '../services/eventService'
import { getMachineDashboard, getMachines, updateMachineDashboardStatus } from '../services/machineService'
import { finalizeShiftReport } from '../services/reportService'
import { closeShiftMachineOrder, deleteShiftMachineSetup, getShiftMachineSetups, setupShift, startShift } from '../services/shiftService'
import { MACHINE_STATUS_FILTERS, getMachineStatusKey } from '../utils/machineStatus'
import CloseShiftScreen from './CloseShiftScreen'
import EventForm from './EventForm'
import ShiftSetupForm from './ShiftSetupForm'
import CompactModeToggle from './turno-dashboard/CompactModeToggle'
import MachineStatusCard from './turno-dashboard/MachineStatusCard'
import StatusEditModal from './turno-dashboard/StatusEditModal'

const shiftNumbers = [1, 2]
const DASHBOARD_STORAGE_KEY = 'turnoDashboardState'

export default function TurnoDashboard() {
  const apiOrigin = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:8000'
  const [machines, setMachines] = useState([])
  const [loadingMachines, setLoadingMachines] = useState(true)
  const [startingShift, setStartingShift] = useState(false)
  const [activeShift, setActiveShift] = useState(null)
  const [events, setEvents] = useState([])
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [closingShift, setClosingShift] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  const [view, setView] = useState('overview')
  const [lastClosedMachineId, setLastClosedMachineId] = useState('')
  const [setupSubmitting, setSetupSubmitting] = useState(false)
  const [eventMachineId, setEventMachineId] = useState('')
  const [setupMachineId, setSetupMachineId] = useState('')
  const [setupRecordId, setSetupRecordId] = useState('')
  const [setupMode, setSetupMode] = useState('primary')
  const [setupReturnView, setSetupReturnView] = useState('active')
  const [prefillSetupStatus, setPrefillSetupStatus] = useState('')
  const [prefillSetupStatusDescription, setPrefillSetupStatusDescription] = useState('')
  const [initializedMachines, setInitializedMachines] = useState({})
  const [machineOrderStatus, setMachineOrderStatus] = useState({})
  const [selectedSidebarMachineId, setSelectedSidebarMachineId] = useState('')
  const [persistedSetups, setPersistedSetups] = useState([])
  const [dashboardHydrated, setDashboardHydrated] = useState(false)
  const [compactMode, setCompactMode] = useState(() => {
    try {
      return window.localStorage.getItem('compactMobileMode') === 'true'
    } catch {
      return false
    }
  })
  const [currentUser, setCurrentUser] = useState({ id: '', full_name: '' })
  const [form, setForm] = useState({
    employeeId: '',
    shiftNumber: 1,
    machineId: '',
  })
  const [machineStatusFilter, setMachineStatusFilter] = useState('all')
  const [statusEditOpen, setStatusEditOpen] = useState(false)
  const [statusEditMachineId, setStatusEditMachineId] = useState('')
  const [statusEditMachineStatus, setStatusEditMachineStatus] = useState('en_produccion')
  const [statusEditMachineDescription, setStatusEditMachineDescription] = useState('')
  const [savingStatusEdit, setSavingStatusEdit] = useState(false)
  const [pendingDeleteSetup, setPendingDeleteSetup] = useState(null)
  const [deletingSetup, setDeletingSetup] = useState(false)

  // Preserve the machine status from the server instead of resetting to neutral
  const normalizeMachinesToNeutral = (machineList) =>
    (Array.isArray(machineList) ? machineList : [])

  useEffect(() => {
    let isMounted = true

    async function loadMachines() {
      try {
        const data = await getMachineDashboard()
        if (!isMounted) return
        const normalizedMachines = normalizeMachinesToNeutral(data)
        setMachines(normalizedMachines)
        setSelectedSidebarMachineId((current) => current || normalizedMachines[0]?.id || '')
        setForm((current) => ({
          ...current,
          machineId: current.machineId || normalizedMachines[0]?.id || '',
        }))
      } catch (error) {
        try {
          const fallback = await getMachines()
          if (!isMounted) return
          const normalizedMachines = normalizeMachinesToNeutral(fallback)
          setMachines(normalizedMachines)
          setSelectedSidebarMachineId((current) => current || normalizedMachines[0]?.id || '')
          setForm((current) => ({
            ...current,
            machineId: current.machineId || normalizedMachines[0]?.id || '',
          }))
        } catch {
          toast.error('No se pudieron cargar las máquinas')
        }
      } finally {
        if (isMounted) setLoadingMachines(false)
      }
    }

    loadMachines()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    // Cargar usuario, restaurar dashboard y sincronizar todo al inicio
    try {
      // 1. Cargar usuario desde localStorage
      const storedUser = window.localStorage.getItem('user')
      let userId = ''
      let userName = ''
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          userId = parsedUser?.id ?? ''
          userName = parsedUser?.full_name ?? ''
          if (userId) {
            setCurrentUser({ id: userId, full_name: userName })
          }
        } catch {
          // Ignore user parsing errors
        }
      }

      // 2. Restaurar dashboard state si existe
      const storedValue = window.localStorage.getItem(DASHBOARD_STORAGE_KEY)
      if (!storedValue) return
      
      const parsedValue = JSON.parse(storedValue)
      if (!parsedValue || typeof parsedValue !== 'object') return

      const activeShiftFromStorage = parsedValue.activeShift ?? null
      const restoredView = parsedValue.view ?? (activeShiftFromStorage ? 'active' : 'overview')
      const restoredForm = parsedValue.form ?? { employeeId: '', shiftNumber: 1, machineId: '' }

      // 3. Asegurar que employeeId siempre sea el usuario actual si hay activeShift
      if (activeShiftFromStorage && userId) {
        restoredForm.employeeId = userId
      }

      setActiveShift(activeShiftFromStorage)
      setView(restoredView)
      setForm(restoredForm)
      setSelectedSidebarMachineId(parsedValue.selectedSidebarMachineId ?? activeShiftFromStorage?.machine_id ?? '')
      setEventMachineId(parsedValue.eventMachineId ?? activeShiftFromStorage?.machine_id ?? '')
      setSetupMachineId(parsedValue.setupMachineId ?? activeShiftFromStorage?.machine_id ?? '')
      setSetupRecordId(parsedValue.setupRecordId ?? '')
      setSetupMode(parsedValue.setupMode ?? 'primary')
      setSetupReturnView(parsedValue.setupReturnView ?? 'active')
      setPrefillSetupStatus(parsedValue.prefillSetupStatus ?? '')
      setPrefillSetupStatusDescription(parsedValue.prefillSetupStatusDescription ?? '')
      setLastClosedMachineId(parsedValue.lastClosedMachineId ?? '')
      setMachineStatusFilter(parsedValue.machineStatusFilter ?? 'all')
    } catch {
      // Ignore storage errors
    } finally {
      setDashboardHydrated(true)
    }
  }, [])

  // Si no hay activeShift, cargar usuario para el formulario inicial
  useEffect(() => {
    if (activeShift) return // Si hay activeShift, ya se cargó el usuario arriba
    
    try {
      const storedUser = window.localStorage.getItem('user')
      if (!storedUser) return
      const parsedUser = JSON.parse(storedUser)
      const userId = parsedUser?.id ?? ''
      const userName = parsedUser?.full_name ?? ''
      if (userId) {
        setCurrentUser({ id: userId, full_name: userName })
        setForm((current) => ({ ...current, employeeId: userId }))
      }
    } catch {
      // Ignore invalid or missing user data.
    }
  }, [activeShift])

  useEffect(() => {
    try {
      window.localStorage.setItem('compactMobileMode', String(compactMode))
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [compactMode])

  useEffect(() => {
    if (!dashboardHydrated) return

    try {
      const payload = {
        activeShift,
        view,
        form,
        selectedSidebarMachineId,
        setupMachineId,
        setupRecordId,
        setupMode,
        setupReturnView,
        prefillSetupStatus,
        prefillSetupStatusDescription,
        eventMachineId,
        lastClosedMachineId,
        machineStatusFilter,
      }
      window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [
    activeShift,
    view,
    form,
    selectedSidebarMachineId,
    setupMachineId,
    setupRecordId,
    setupMode,
    setupReturnView,
    prefillSetupStatus,
    prefillSetupStatusDescription,
    eventMachineId,
    lastClosedMachineId,
    machineStatusFilter,
    dashboardHydrated,
  ])

  const selectedMachine = useMemo(
    () => (Array.isArray(machines) ? machines.find((machine) => machine.id === form.machineId) : undefined),
    [machines, form.machineId],
  )
  const selectedSetupMachine = useMemo(
    () => (Array.isArray(machines) ? machines.find((machine) => machine.id === setupMachineId) : undefined),
    [machines, setupMachineId],
  )
  const selectedSidebarMachine = useMemo(
    () => (Array.isArray(machines) ? machines.find((machine) => machine.id === selectedSidebarMachineId) : undefined),
    [machines, selectedSidebarMachineId],
  )
  const currentSetup = useMemo(
    () => {
      const machineSetups = persistedSetups.filter((setup) => setup.machine_id === setupMachineId)
      if (setupRecordId) {
        return machineSetups.find((setup) => setup.id === setupRecordId) ?? null
      }
      return machineSetups.filter((setup) => setup.order_status === 'open').at(-1) ?? null
    },
    [persistedSetups, setupMachineId, setupRecordId],
  )
  const selectedMachineSetup = useMemo(
    () => {
      const machineSetups = persistedSetups.filter((setup) => setup.machine_id === selectedSidebarMachineId)
      return machineSetups.filter((setup) => setup.order_status === 'open').at(-1) ?? machineSetups.at(-1) ?? null
    },
    [persistedSetups, selectedSidebarMachineId],
  )
  const selectedMachineSetups = useMemo(
    () =>
      persistedSetups
        .filter((setup) => setup.machine_id === selectedSidebarMachineId)
        .slice()
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [persistedSetups, selectedSidebarMachineId],
  )
  const selectedMachineEvents = useMemo(() => {
    if (!selectedSidebarMachineId) return []
    const selectedCode = selectedSidebarMachine?.code
    return events.filter((event) => {
      if (event?.machine_id) {
        return event.machine_id === selectedSidebarMachineId
      }
      if (selectedCode && event?.machine_code) {
        return event.machine_code === selectedCode
      }
      return false
    })
  }, [events, selectedSidebarMachineId, selectedSidebarMachine])
  const machineStatusCounts = useMemo(
    () =>
      machines.reduce(
        (accumulator, machine) => {
          const statusKey = getMachineStatusKey(machine)
          accumulator[statusKey] = (accumulator[statusKey] || 0) + 1
          return accumulator
        },
        { en_produccion: 0, en_mantenimiento: 0, fuera_de_servicio: 0, sin_registro: 0 },
      ),
    [machines],
  )
  const filteredMachines = useMemo(() => {
    if (machineStatusFilter === 'all') return machines
    return machines.filter((machine) => getMachineStatusKey(machine) === machineStatusFilter)
  }, [machines, machineStatusFilter])

  function handleOpenStatusEdit(machineId) {
    const machine = machines.find((item) => item.id === machineId)
    if (!machine) return
    setStatusEditMachineId(machineId)
    setStatusEditMachineStatus(getMachineStatusKey(machine))
    setStatusEditMachineDescription(machine.current_status_description ?? '')
    setStatusEditOpen(true)
  }

  function handleCloseStatusEdit() {
    setStatusEditOpen(false)
    setStatusEditMachineId('')
    setStatusEditMachineStatus('en_produccion')
    setStatusEditMachineDescription('')
  }

  async function handleSaveStatusEdit() {
    if (!statusEditMachineId || savingStatusEdit) return

    if (statusEditMachineStatus === 'sin_registro') {
      toast.error('Selecciona un estado válido antes de confirmar el cambio')
      return
    }

    const requiresDescription =
      statusEditMachineStatus === 'en_mantenimiento' || statusEditMachineStatus === 'fuera_de_servicio'
    const trimmedDescription = statusEditMachineDescription.trim()

    if (requiresDescription && !trimmedDescription) {
      toast.error('Debes escribir una descripción para mantenimiento o fuera de servicio')
      return
    }

    setSavingStatusEdit(true)
    try {
      const updatedMachine = await updateMachineDashboardStatus(statusEditMachineId, {
        machine_status: statusEditMachineStatus,
        machine_status_description: trimmedDescription,
      })

      setMachines((current) =>
        current.map((machine) => {
          if (machine.id !== updatedMachine.id) return machine
          return {
            ...machine,
            ...updatedMachine,
            current_status: updatedMachine?.current_status ?? updatedMachine?.machine_status ?? statusEditMachineStatus,
            current_status_description:
              updatedMachine?.current_status_description ??
              (statusEditMachineStatus === 'en_produccion' ? '' : trimmedDescription),
          }
        }),
      )
      if (activeShift?.id) {
        await refreshPersistedSetups(activeShift.id)
      }
      if (selectedSidebarMachineId === updatedMachine.id) {
        setSelectedSidebarMachineId(updatedMachine.id)
      }
      toast.success('Estado de la máquina actualizado')
      handleCloseStatusEdit()
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo actualizar el estado de la máquina')
    } finally {
      setSavingStatusEdit(false)
    }
  }

  async function refreshPersistedSetups(shiftId) {
    if (!shiftId) return
    try {
      const setups = await getShiftMachineSetups(shiftId)
      setPersistedSetups(setups)
      const map = {}
      const orderMap = {}
      setups.forEach((item) => {
        map[item.machine_id] = true
        orderMap[item.machine_id] = item.order_status || 'open'
      })
      setInitializedMachines(map)
      setMachineOrderStatus(orderMap)
    } catch {
      toast.error('No se pudo cargar el estado de inicio por máquina')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.machineId) {
      toast.error('Selecciona una máquina para iniciar el turno')
      return
    }

    if (!form.employeeId) {
      toast.error('No se pudo identificar al operario. Vuelve a iniciar sesión.')
      return
    }

    setStartingShift(true)

    try {
      const payload = {
        user_id: form.employeeId,
        machine_id: form.machineId,
        area: selectedMachine?.area_name || selectedMachine?.area?.name || 'Sin área',
        shift_number: form.shiftNumber,
        shift_date: new Date().toISOString().slice(0, 10),
      }

      const data = await startShift(payload)
      setActiveShift({
        ...data,
        employee: currentUser.full_name || 'Operario',
        machineName: selectedMachine?.name ?? 'Máquina seleccionada',
      })
      setEventMachineId(form.machineId)
      setSetupMachineId(form.machineId)
      setSetupMode('primary')
      setSetupReturnView('active')
      setInitializedMachines({})
      setMachineOrderStatus({})
      setPersistedSetups([])
      setEvents([])
      setReportUrl('')
      setSelectedSidebarMachineId(form.machineId)
      setView('setup')
      toast.success('Turno creado. Completa los datos de inicio.')
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo iniciar el turno')
    } finally {
      setStartingShift(false)
    }
  }

  async function handleCreateEvent({ machineId, description, eventTime, eventEndTime }) {
    if (!activeShift?.id) {
      toast.error('No hay un turno activo')
      return
    }

    if (!machineId) {
      toast.error('Selecciona una máquina para registrar el evento')
      return
    }

    if (!initializedMachines[machineId]) {
      const machine = machines.find((item) => item.id === machineId)
      const shouldStart = window.confirm(
        `No ha agregado inicio de turno en la máquina ${machine?.code ?? ''} ${machine?.name ?? ''}. ¿Desea iniciar sesión en esa máquina?`,
      )
      if (shouldStart) {
        setEventFormOpen(false)
        setForm((current) => ({ ...current, machineId }))
        setSetupMachineId(machineId)
        setSetupMode('secondary')
        setSetupReturnView('active')
        setView('setup')
      }
      return
    }

    setSavingEvent(true)

    try {
      const createdEvent = await createEventMultipart({
        shiftId: activeShift.id,
        machineId,
        description,
        eventTime,
        eventEndTime,
      })

      const currentMachine = machines.find((machine) => machine.id === machineId)
      setEvents((current) => [
        {
          ...createdEvent,
          machine_name: currentMachine?.name ?? 'Máquina no identificada',
          machine_code: currentMachine?.code ?? 'N/A',
        },
        ...current,
      ])
      setEventFormOpen(false)
      toast.success('Novedad registrada. Puedes seleccionar otra máquina y continuar.')
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo guardar la novedad')
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleFinalizeShift() {
    if (!activeShift?.id) return

    const shouldClose = window.confirm('¿Desea cerrar la orden y generar el informe ahora?')
    if (!shouldClose) return

    setClosingShift(true)

    try {
      const data = await finalizeShiftReport(activeShift.id)
      setReportUrl(data.pdf_url)
      setView('close')
      setLastClosedMachineId(activeShift.machine_id)
      toast.success('Informe generado correctamente')
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo generar el informe')
    } finally {
      setClosingShift(false)
    }
  }

  async function handleSetupComplete(formData) {
    try {
      formData.append('machine_id', setupMachineId)
      await setupShift(activeShift.id, formData)
      setInitializedMachines((current) => ({
        ...current,
        [setupMachineId]: true,
      }))
      setMachineOrderStatus((current) => ({
        ...current,
        [setupMachineId]: 'active',
      }))
      await refreshPersistedSetups(activeShift.id)
      setEventMachineId(setupMachineId)
      if (setupReturnView === 'machine-start') {
        setView('active')
      } else if (setupReturnView === 'close') {
        setView('close')
      } else {
        setView('active')
      }
      toast.success('Inicio de turno registrado en la máquina')
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo guardar la configuración del turno')
      throw error
    }
  }

  function handleOpenMachineSetupMenu() {
    setView('active')
  }

  function handleOpenMachineDetail(machineId) {
    if (!machineId) return
    setSelectedSidebarMachineId(machineId)
    setEventMachineId(machineId)
    setForm((current) => ({ ...current, machineId }))
    setView('detail')
  }

  function handleOpenStartFlow(machineId) {
    if (!machineId) return
    const machine = machines.find((item) => item.id === machineId)
    const statusKey = machine ? getMachineStatusKey(machine) : 'sin_registro'

    if (statusKey === 'sin_registro') {
      toast.error('Define primero el estado de la máquina desde el panel principal')
      return
    }

    setForm((current) => ({ ...current, machineId }))
    setSelectedSidebarMachineId(machineId)
    setSetupMachineId(machineId)
    setSetupRecordId('')
    setPrefillSetupStatus(statusKey)
    setPrefillSetupStatusDescription(machine?.current_status_description ?? '')
    setSetupMode('primary')
    setSetupReturnView('active')
    setView(activeShift ? 'active' : 'machine-start')
  }

  function handleAddMorePhotosFromClose() {
    if (!activeShift?.id) return
    const machineId = selectedSidebarMachineId || activeShift.machine_id
    setSetupMachineId(machineId)
    setSetupRecordId('')
    setSetupMode('secondary')
    setSetupReturnView('close')
    setView('setup')
  }

  function handleAddMoreEventsFromClose() {
    const machineId = selectedSidebarMachineId
    if (!machineId) return

    const machine = machines.find((item) => item.id === machineId)
    const statusKey = machine ? getMachineStatusKey(machine) : 'sin_registro'

    if (statusKey !== 'en_produccion') {
      handleOpenStatusEdit(machineId)
      setStatusEditMachineStatus('en_produccion')
      setStatusEditMachineDescription('')
      toast.error('Para agregar una novedad, primero debes cambiar la máquina a En producción')
      return
    }

    setView('active')
    setEventMachineId(machineId)
    setEventFormOpen(true)
  }

  function handleOpenMachineEvents(machineId, allowClosedOrder = false) {
    if (!machineId) return
    const machine = machines.find((item) => item.id === machineId)
    const statusKey = machine ? getMachineStatusKey(machine) : 'sin_registro'
    const currentOrderStatus = machineOrderStatus[machineId] ?? 'none'

    setSelectedSidebarMachineId(machineId)
    setEventMachineId(machineId)
    setForm((current) => ({ ...current, machineId }))

    if (!activeShift?.id) {
      toast.error('Primero inicia un turno para agregar novedades')
      return
    }

    if (statusKey !== 'en_produccion') {
      handleOpenStatusEdit(machineId)
      setStatusEditMachineStatus('en_produccion')
      setStatusEditMachineDescription('')
      toast.error('Para agregar una novedad, primero debes cambiar la máquina a En producción')
      return
    }

    if (!allowClosedOrder && currentOrderStatus !== 'active') {
      toast.error('Primero debes abrir e iniciar una nueva orden en esta máquina')
      return
    }

    setView('active')
    setEventFormOpen(true)
  }

  function handleStartNextOrder() {
    const machineId = selectedSidebarMachineId || lastClosedMachineId || activeShift?.machine_id || form.machineId
    if (!machineId) return
    setMachineOrderStatus((current) => ({
      ...current,
      [machineId]: 'active',
    }))
    setEventMachineId(machineId)
    setSetupMachineId(machineId)
    setSetupRecordId('')
    setSelectedSidebarMachineId(machineId)
    setForm((current) => ({ ...current, machineId }))
    setSetupMode('secondary')
    setSetupReturnView('active')
    setView('setup')
  }

  async function handleCloseCurrentOrder(machineId) {
    if (!activeShift?.id || !machineId) return
    try {
      await closeShiftMachineOrder(activeShift.id, machineId)
      setMachineOrderStatus((current) => ({
        ...current,
        [machineId]: 'closed',
      }))
      await refreshPersistedSetups(activeShift.id)
      setSelectedSidebarMachineId(machineId)
      setEventMachineId(machineId)
      setView('active')
      toast.success('Orden cerrada con éxito')
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo cerrar la orden')
    }
  }

  function handleStartNextOrderForMachine(machineId) {
    setEventMachineId(machineId)
    setSetupMachineId(machineId)
    setSelectedSidebarMachineId(machineId)
    setForm((current) => ({ ...current, machineId }))
    setPrefillSetupStatus('en_produccion')
    setPrefillSetupStatusDescription('')
    setSetupMode('next-order')
    setSetupReturnView('active')
    setView('setup')
  }

  function handleCompleteMachinePhotos(machineId) {
    setEventFormOpen(false)
    setForm((current) => ({ ...current, machineId }))
    setSetupMachineId(machineId)
    setPrefillSetupStatus('en_produccion')
    setPrefillSetupStatusDescription('')
    setSetupMode('secondary')
    setSetupReturnView('active')
    setView('setup')
  }

  function handleRequestDeleteSetup(setup) {
    if (!setup?.id) return
    setPendingDeleteSetup({
      id: setup.id,
      machineId: setup.machine_id,
      machineCode: setup.machine_code,
      workOrder: setup.work_order,
    })
  }

  function handleCancelDeleteSetup() {
    if (deletingSetup) return
    setPendingDeleteSetup(null)
  }

  async function handleConfirmDeleteSetup() {
    if (!activeShift?.id || !pendingDeleteSetup?.id || deletingSetup) return

    setDeletingSetup(true)
    try {
      await deleteShiftMachineSetup(activeShift.id, pendingDeleteSetup.id)
      toast.success('Orden eliminada correctamente')
      setPendingDeleteSetup(null)
      await refreshPersistedSetups(activeShift.id)
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? 'No se pudo eliminar la orden')
    } finally {
      setDeletingSetup(false)
    }
  }

  function handleEditMachineSetup(machineId, returnView = 'active', setupId = '') {
    const machine = machines.find((item) => item.id === machineId)
    const statusKey = machine ? getMachineStatusKey(machine) : 'sin_registro'
    if (statusKey === 'sin_registro') {
      toast.error('No puedes iniciar turno en neutro. Cambia primero el estado desde el panel principal.')
      return
    }

    setEventFormOpen(false)
    setForm((current) => ({ ...current, machineId }))
    setSetupMachineId(machineId)
    setSetupRecordId(setupId || '')
    setSelectedSidebarMachineId(machineId)
    setPrefillSetupStatus(statusKey)
    setPrefillSetupStatusDescription(machine?.current_status_description ?? '')
    setSetupMode('secondary')
    setSetupReturnView(returnView)
    setView('setup')
  }

  useEffect(() => {
    if (!activeShift?.id) return
    refreshPersistedSetups(activeShift.id)
  }, [activeShift?.id])

  useEffect(() => {
    if (!activeShift) return
    if (selectedSidebarMachineId) return
    if (form.machineId) {
      setSelectedSidebarMachineId(form.machineId)
      return
    }
    if (machines[0]?.id) {
      setSelectedSidebarMachineId(machines[0].id)
    }
  }, [activeShift, selectedSidebarMachineId, form.machineId, machines])

  function handleStartMachineSetup() {
    if (!form.machineId) {
      toast.error('Selecciona una máquina')
      return
    }

    const machine = machines.find((item) => item.id === form.machineId)
    const statusKey = machine ? getMachineStatusKey(machine) : 'sin_registro'
    if (statusKey === 'sin_registro') {
      toast.error('No puedes iniciar turno en neutro. Cambia primero el estado desde el panel principal.')
      return
    }

    if (initializedMachines[form.machineId]) {
      toast('Esa máquina ya tiene inicio de turno registrado')
      return
    }

    setSetupMachineId(form.machineId)
    setSetupRecordId('')
    setSelectedSidebarMachineId(form.machineId)
    setSetupMode('secondary')
    setSetupReturnView('machine-start')
    setView('setup')
  }

  if (view === 'setup' && activeShift) {
    return (
      <ShiftSetupForm
        key={setupMachineId}
        shift={activeShift}
        machineName={selectedSetupMachine?.name ?? activeShift.machineName}
        setupId={setupRecordId || null}
        initialSetup={setupMode === 'next-order' ? null : currentSetup}
        prefillMachineStatus={prefillSetupStatus}
        prefillMachineStatusDescription={prefillSetupStatusDescription}
        lockStatusStep={setupMode === 'primary'}
        isEditing={Boolean(setupRecordId)}
        compactMode={compactMode}
        onToggleCompactMode={() => setCompactMode((current) => !current)}
        onBack={() => setView(setupReturnView === 'machine-start' ? 'machine-start' : 'active')}
        onComplete={handleSetupComplete}
        submitting={setupSubmitting}
        setSubmitting={setSetupSubmitting}
      />
    )
  }

  if (view === 'overview' && !activeShift) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.10),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_100%)] px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
        <section className="mx-auto flex max-w-7xl flex-col gap-5">
          <header className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-3xl bg-sky-500/10 p-4 text-sky-700">
                  <Factory className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-700/80">Panel de planta</p>
                  <h1 className="text-3xl font-semibold text-slate-900">Estado de máquinas</h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Revisa el estado actual de cada máquina y abre el formulario de turno solo cuando necesites iniciar una operación.
                  </p>
                </div>
              </div>
              
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-400 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">Producción</p>
                <p className="mt-2 text-lg font-semibold text-emerald-100">{machineStatusCounts.en_produccion} verde</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-700/80">Mantenimiento</p>
                <p className="mt-2 text-lg font-semibold text-amber-950">{machineStatusCounts.en_mantenimiento} amarillo</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-rose-700/80">Fuera de servicio</p>
                <p className="mt-2 text-lg font-semibold text-rose-500">{machineStatusCounts.fuera_de_servicio} rojo</p>
              </div>
            </div>
          </header>

          <section className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Máquinas disponibles</p>
                <h2 className="text-2xl font-semibold text-slate-900">Selecciona una máquina</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {filteredMachines.length} de {machines.length} máquinas
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {MACHINE_STATUS_FILTERS.map((item) => {
                const isActive = machineStatusFilter === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMachineStatusFilter(item.value)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                      isActive
                        ? 'border-sky-400/60 bg-sky-400/10 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMachines.map((machine) => (
                <MachineStatusCard
                  key={machine.id}
                  machine={machine}
                  selected={selectedSidebarMachineId === machine.id}
                  onSelect={() => setSelectedSidebarMachineId(machine.id)}
                  onStart={() => handleOpenStartFlow(machine.id)}
                  onOpenNewOrder={() => handleStartNextOrderForMachine(machine.id)}
                  onEditStatus={() => handleOpenStatusEdit(machine.id)}
                  onOpenEvents={() => handleOpenMachineEvents(machine.id)}
                  onViewDetails={() => handleOpenMachineDetail(machine.id)}
                  isStarted={Boolean(initializedMachines[machine.id]) || persistedSetups.some((setup) => setup.machine_id === machine.id)}
                  orderStatus={machineOrderStatus[machine.id] ?? 'none'}
                />
              ))}
            </div>

            
          </section>
        </section>

        <StatusEditModal
          open={statusEditOpen}
          machine={machines.find((machine) => machine.id === statusEditMachineId) ?? null}
          value={statusEditMachineStatus}
          description={statusEditMachineDescription}
          saving={savingStatusEdit}
          onClose={handleCloseStatusEdit}
          onChangeValue={setStatusEditMachineStatus}
          onChangeDescription={setStatusEditMachineDescription}
          onSave={handleSaveStatusEdit}
        />
      </main>
    )
  }

  if (view === 'machine-start' && activeShift) {
    return (
      <main className="min-h-screen bg-app px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
        <section className={`mx-auto flex max-w-3xl flex-col ${compactMode ? 'gap-6 pb-28' : 'gap-5'}`}>
          <header className="rounded-3xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-glow backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-700">
                  <Factory className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-sky-700/80">Inicio por máquina</p>
                  <h1 className="text-2xl font-semibold text-slate-900">Seleccionar máquina</h1>
                </div>
              </div>
              <CompactModeToggle compactMode={compactMode} onToggle={() => setCompactMode((current) => !current)} />
            </div>
        
          </header>

          <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-glow backdrop-blur">
            <label className="grid gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Factory className="h-4 w-4 text-sky-700" />
                Máquina
              </span>
              <div className="relative">
                <select
                  value={form.machineId}
                  onChange={(event) => setForm((current) => ({ ...current, machineId: event.target.value }))}
                  disabled={loadingMachines}
                  className={`${compactMode ? 'h-16 text-lg' : 'h-14 text-base'} w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-slate-900 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-wait disabled:opacity-70`}
                >
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id} className="bg-white text-slate-900">
                      {machine.code} - {machine.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              </div>
            </label>

            <button
              type="button"
              onClick={handleStartMachineSetup}
              className={`mt-4 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 font-semibold text-slate-950 shadow-[0_18px_40px_rgba(14,165,233,0.30)] transition hover:brightness-110 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
            >
              <PlayCircle className="h-5 w-5" />
              Iniciar turno en esta máquina
            </button>

            {initializedMachines[form.machineId] ? (
              <button
                type="button"
                onClick={() => handleEditMachineSetup(form.machineId, 'machine-start')}
                className={`mt-3 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-5 font-semibold text-cyan-900 transition hover:bg-cyan-500/15 ${compactMode ? 'h-16 text-lg' : 'h-12 text-sm'}`}
              >
                <PencilLine className="h-5 w-5" />
                Editar información guardada de esta máquina
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setView('close')}
              className={`mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-medium text-slate-700 transition hover:bg-slate-50 ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
            >
              Volver a cierre de turno
            </button>
          </section>
        </section>
      </main>
    )
  }

  if (view === 'close' && activeShift) {
    const downloadUrl = reportUrl
      ? (/^https?:\/\//i.test(reportUrl) ? reportUrl : `${apiOrigin}${reportUrl}`)
      : ''

    return (
      <CloseShiftScreen
        shift={activeShift}
        events={events}
        setups={persistedSetups}
        generating={closingShift}
        reportUrl={downloadUrl}
        compactMode={compactMode}
        onToggleCompactMode={() => setCompactMode((current) => !current)}
        onFinalize={handleFinalizeShift}
        onBack={() => setView('active')}
        onGoToStartMenu={handleOpenMachineSetupMenu}
        onAddMoreEvents={handleAddMoreEventsFromClose}
        onAddMorePhotos={handleAddMorePhotosFromClose}
        onStartNextOrder={handleStartNextOrder}
      />
    )
  }

  if (view === 'detail' && selectedSidebarMachine) {
    const detailStatusKey = getMachineStatusKey(selectedSidebarMachine)
    const isProductionDetail = detailStatusKey === 'en_produccion'
    const detailOrderIsClosed = machineOrderStatus[selectedSidebarMachineId] === 'closed'

    return (
      <main className="premium-shell px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
        <section className={`mx-auto flex max-w-5xl flex-col gap-5 ${compactMode ? 'pb-28' : 'pb-24'}`}>
          <header className="rounded-[28px] border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Detalle de máquina</p>
                <h1 className="text-2xl font-semibold text-slate-900">{selectedSidebarMachine.code} - {selectedSidebarMachine.name}</h1>
              </div>
              <button
                type="button"
                onClick={() => setView(activeShift ? 'active' : 'overview')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-50 ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            </div>
          </header>

          {isProductionDetail ? (
            <>
              <section className="rounded-[28px] border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Orden actual</h2>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                    En producción
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">WOCO</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedMachineSetup?.work_order || selectedSidebarMachine.current_work_order || 'Sin orden activa'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Referencia</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedMachineSetup?.ref_order || selectedSidebarMachine.current_ref_order || 'Sin referencia'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estado de orden</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{detailOrderIsClosed ? 'Cerrada' : 'Activa'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Última actividad</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedSidebarMachine.last_activity_at ? new Date(selectedSidebarMachine.last_activity_at).toLocaleString() : 'Sin historial'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Novedades</h2>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {selectedMachineEvents.length} registros
                  </span>
                </div>

                <div className="grid gap-3">
                  {selectedMachineEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                      No hay novedades registradas para esta máquina.
                    </div>
                  ) : (
                    selectedMachineEvents.map((event) => (
                      <article key={event.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 sm:p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{event.event_time}</p>
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                            {event.machine_code ?? selectedSidebarMachine.code}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{event.description}</p>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">Acciones de orden</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleCloseCurrentOrder(selectedSidebarMachineId)}
                    disabled={!activeShift?.id || detailOrderIsClosed}
                    className={`inline-flex items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 font-semibold text-amber-950 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-amber-100 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
                  >
                    Cerrar orden actual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartNextOrderForMachine(selectedSidebarMachineId)}
                    disabled={!activeShift?.id || !detailOrderIsClosed}
                    className={`sm:col-span-2 inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 hover:brightness-110 h-16 text-lg : h-14 text-base`}
                  >
                    Abrir otra orden en esta máquina
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="premium-card rounded-3xl p-4 backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Estado actual</h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {detailStatusKey === 'en_mantenimiento' ? 'Mantenimiento' : detailStatusKey === 'fuera_de_servicio' ? 'Fuera de servicio' : 'Neutro'}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700">
                {selectedSidebarMachine.current_status_description || 'No hay descripción registrada para este estado.'}
              </div>
              <button
                type="button"
                onClick={() => handleOpenStatusEdit(selectedSidebarMachineId)}
                className={`mt-4 inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-50 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
              >
                <PencilLine className="h-5 w-5" />
                Cambiar estado
              </button>
            </section>
          )}
        </section>

        <EventForm
          open={eventFormOpen}
          onClose={() => setEventFormOpen(false)}
          compactMode={compactMode}
          onToggleCompactMode={() => setCompactMode((current) => !current)}
          onSubmit={handleCreateEvent}
          machines={machines}
          selectedMachineId={eventMachineId}
          selectedMachineOrderStatus={machineOrderStatus[eventMachineId] ?? 'none'}
          onMachineChange={setEventMachineId}
          submitting={savingEvent}
        />

        <StatusEditModal
          open={statusEditOpen}
          machine={machines.find((machine) => machine.id === statusEditMachineId) ?? null}
          value={statusEditMachineStatus}
          description={statusEditMachineDescription}
          saving={savingStatusEdit}
          onClose={handleCloseStatusEdit}
          onChangeValue={setStatusEditMachineStatus}
          onChangeDescription={setStatusEditMachineDescription}
          onSave={handleSaveStatusEdit}
        />
      </main>
    )
  }

  if (activeShift) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.18),_transparent_32%),linear-gradient(180deg,_#f7fafc_0%,_#eef4f8_100%)] px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
        <section className={`mx-auto flex max-w-6xl flex-col gap-5 ${compactMode ? 'pb-28' : 'pb-24'}`}>

          <div className={`flex flex-col ${compactMode ? 'gap-6' : 'gap-5'}`}>
            <section className="rounded-[28px] border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Vista unificada</p>
                  <h2 className="text-xl font-semibold text-slate-900">Inicio y operación en un solo panel</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {filteredMachines.length} máquinas
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {MACHINE_STATUS_FILTERS.map((item) => {
                  const isActive = machineStatusFilter === item.value
                  return (
                    <button
                      key={`active-filter-${item.value}`}
                      type="button"
                      onClick={() => setMachineStatusFilter(item.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        isActive
                          ? 'premium-btn-primary'
                          : 'premium-btn-secondary'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMachines.map((machine) => (
                  <MachineStatusCard
                    key={`active-${machine.id}`}
                    machine={machine}
                    selected={selectedSidebarMachineId === machine.id}
                    onSelect={() => {
                      setSelectedSidebarMachineId(machine.id)
                      setEventMachineId(machine.id)
                      setForm((current) => ({ ...current, machineId: machine.id }))
                    }}
                    onStart={() => handleEditMachineSetup(machine.id, 'active')}
                    onOpenNewOrder={() => handleStartNextOrderForMachine(machine.id)}
                    onEditStatus={() => handleOpenStatusEdit(machine.id)}
                    onOpenEvents={() => handleOpenMachineEvents(machine.id)}
                    onViewDetails={() => handleOpenMachineDetail(machine.id)}
                    isStarted={Boolean(initializedMachines[machine.id]) || persistedSetups.some((setup) => setup.machine_id === machine.id)}
                    orderStatus={machineOrderStatus[machine.id] ?? 'none'}
                  />
                ))}
              </div>
            </section>

          </div>

          <section className="premium-card rounded-3xl p-4 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedSidebarMachine
                    ? `Inicios de turno de ${selectedSidebarMachine.code}`
                    : 'Inicios de turno por máquina'}
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {selectedMachineSetups.length} registros
              </span>
            </div>

            <div className="grid gap-3">
              {selectedMachineSetups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-500">
                  {selectedSidebarMachine
                    ? 'Aún no hay inicios de turno persistidos para esta máquina.'
                    : 'Selecciona una máquina para ver sus inicios de turno.'}
                </div>
              ) : (
                selectedMachineSetups.map((setup) => (
                  <article key={setup.id || `${setup.machine_id}-${setup.created_at}`} className="premium-panel rounded-2xl p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {setup.machine_code} - {setup.machine_name}
                      </p>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        {setup.machine_status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Área: {setup.area}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Estado de la orden</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{setup.order_status === 'closed' ? 'Cerrada' : 'Abierta'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Número de orden</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{setup.work_order || 'Sin número de orden'}</p>
                      </div>
                    </div>
                    {setup.machine_status === 'en_produccion' && !setup.startup_photos_complete ? (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                        Faltan fotos: {setup.missing_startup_photos.join(', ')}
                      </div>
                    ) : null}
                    {setup.machine_status_description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-700">{setup.machine_status_description}</p>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleOpenMachineEvents(setup.machine_id, true)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 font-semibold text-cyan-950 transition hover:bg-cyan-100 ${compactMode ? 'h-14 text-base w-full' : 'h-10 text-xs'}`}
                      >
                        <PlusCircle className="h-4 w-4" />
                        Agregar novedad
                      </button>
                      {setup.startup_photos_complete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditMachineSetup(setup.machine_id, 'active', setup.id)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50 ${compactMode ? 'h-14 text-base w-full' : 'h-10 text-xs'}`}
                          >
                            <PencilLine className="h-4 w-4" />
                            Editar orden
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteSetup(setup)}
                            className={`sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 font-semibold text-rose-700 transition hover:bg-rose-100 ${compactMode ? 'h-14 text-base w-full' : 'h-10 text-xs'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar orden
                          </button>
                        </>
                      ) : null}
                    </div>
                    {pendingDeleteSetup?.id === setup.id ? (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-900">Confirmar eliminación de la orden</p>
                        <p className="mt-1 text-xs text-rose-800">
                          Esta acción eliminará la orden {pendingDeleteSetup.workOrder || 'sin número'} de {pendingDeleteSetup.machineCode}. No se puede deshacer.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleCancelDeleteSetup}
                            disabled={deletingSetup}
                            className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${compactMode ? 'h-12 text-sm' : 'h-10 text-xs'}`}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmDeleteSetup}
                            disabled={deletingSetup}
                            className={`inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-600 px-4 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${compactMode ? 'h-12 text-sm' : 'h-10 text-xs'}`}
                          >
                            {deletingSetup ? 'Eliminando...' : 'Sí, eliminar orden'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {setup.machine_status === 'en_produccion' && !setup.startup_photos_complete ? (
                      <button
                        type="button"
                        onClick={() => handleCompleteMachinePhotos(setup.machine_id)}
                        className={`mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 font-semibold text-white transition hover:brightness-110 ${compactMode ? 'h-14 w-full text-base' : 'h-10 text-xs'}`}
                      >
                        Completar fotos de inicio
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </div>

          </section>

          <section className="premium-card rounded-3xl p-4 backdrop-blur-xl sm:p-5">
            <button
              type="button"
              onClick={() => setView('close')}
              className={`premium-btn-secondary mt-3 inline-flex w-full items-center justify-center gap-3 rounded-2xl px-5 font-semibold ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
            >
              <FileText className="h-5 w-5" />
              Ver cierre de turno
            </button>

            <button
              type="button"
              onClick={() => setView('overview')}
              className={`premium-btn-secondary mt-3 inline-flex w-full items-center justify-center gap-3 rounded-2xl px-5 font-medium ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
            >
              <ArrowLeft className="h-5 w-5" />
              Regresar al menú de máquinas
            </button>
          </section>
        </section>

        <EventForm
          open={eventFormOpen}
          onClose={() => setEventFormOpen(false)}
          compactMode={compactMode}
          onToggleCompactMode={() => setCompactMode((current) => !current)}
          onSubmit={handleCreateEvent}
          machines={machines}
          selectedMachineId={eventMachineId}
          selectedMachineOrderStatus={machineOrderStatus[eventMachineId] ?? 'none'}
          onMachineChange={setEventMachineId}
          submitting={savingEvent}
        />

        <StatusEditModal
          open={statusEditOpen}
          machine={machines.find((machine) => machine.id === statusEditMachineId) ?? null}
          value={statusEditMachineStatus}
          description={statusEditMachineDescription}
          saving={savingStatusEdit}
          onClose={handleCloseStatusEdit}
          onChangeValue={setStatusEditMachineStatus}
          onChangeDescription={setStatusEditMachineDescription}
          onSave={handleSaveStatusEdit}
        />
      </main>
    )
  }

  return (
    <main className="premium-shell px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
      <section className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-700">
                <Factory className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-sky-700/80">Dashboard industrial</p>
                <h1 className="text-2xl font-semibold text-slate-900">Inicio de turno</h1>
              </div>
            </div>
            <CompactModeToggle compactMode={compactMode} onToggle={() => setCompactMode((current) => !current)} />
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Elige una máquina desde el tablero y confirma aquí solo cuando ya tengas el arranque listo.
          </p>
        </header>

        <button
          type="button"
          onClick={() => setView('overview')}
          className="premium-btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al menú de máquinas
        </button>

        <form onSubmit={handleSubmit} className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <UserRound className="h-4 w-4 text-sky-700" />
                Nombre del operario
              </span>
              <input
                type="text"
                value={currentUser.full_name || 'Empleado no identificado'}
                readOnly
              className={`${compactMode ? 'h-16 text-lg' : 'h-14 text-base'} premium-input w-full rounded-2xl px-4 transition`}
              />
            </label>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Número de turno</span>
                <div className="relative">
                  <select
                    value={form.shiftNumber}
                    onChange={(event) => setForm((current) => ({ ...current, shiftNumber: Number(event.target.value) }))}
                    className={`${compactMode ? 'h-16 text-lg' : 'h-14 text-base'} premium-input w-full appearance-none rounded-2xl px-4 pr-12`}
                  >
                    {shiftNumbers.map((number) => (
                      <option key={number} value={number} className="bg-white text-slate-900">
                        {number}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </label>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Máquina seleccionada</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {selectedMachine ? `${selectedMachine.code} - ${selectedMachine.name}` : 'Sin máquina seleccionada'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Esta máquina viene desde el panel inicial. Si deseas cambiarla, vuelve al menú de máquinas.
              </p>
            </section>

            <div className="rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4 text-sm text-sky-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  Esta máquina define el arranque del turno. Luego, en cada novedad, podrás elegir la máquina específica del evento.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={startingShift || loadingMachines}
              className={`premium-btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
            >
              {startingShift ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
              Confirmar e iniciar turno
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}


