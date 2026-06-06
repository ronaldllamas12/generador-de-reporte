export const MACHINE_STATUS_META = {
  sin_registro: {
    label: 'Neutro',
    badge: 'border-slate-300 bg-slate-100 text-slate-700',
    panel: 'bg-slate-50',
  },
  en_produccion: {
    label: 'En producción',
    badge: 'border-emerald-500/20 bg-emerald-500 text-emerald-950',
    panel: 'bg-emerald-50',
  },
  en_mantenimiento: {
    label: 'En mantenimiento',
    badge: 'border-amber-500/20 bg-amber-500 text-amber-950',
    panel: 'bg-amber-50',
  },
  fuera_de_servicio: {
    label: 'Fuera de servicio',
    badge: 'border-rose-500/20 bg-rose-500 text-rose-950',
    panel: 'bg-rose-50',
  }
}

export const MACHINE_STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'en_produccion', label: 'Producción' },
  { value: 'en_mantenimiento', label: 'Mantenimiento' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' }
]

export const MACHINE_STATUS_OPTIONS = [
  { value: 'sin_registro', label: 'Neutro' },
  { value: 'en_produccion', label: 'En producción' },
  { value: 'en_mantenimiento', label: 'En mantenimiento' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' },
]

export function getMachineStatusKey(machine) {
  const value = machine?.current_status || machine?.machine_status || ''
  if (value === 'en_produccion' || value === 'en_mantenimiento' || value === 'fuera_de_servicio') {
    return value
  }
  if (machine?.is_active === false) {
    return 'fuera_de_servicio'
  }
  return 'sin_registro'
}