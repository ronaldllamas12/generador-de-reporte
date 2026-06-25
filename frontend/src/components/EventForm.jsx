import { ArrowLeft, ChevronDown, Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function EventForm({
  open,
  onClose,
  onSubmit,
  machines = [],
  selectedMachineId = '',
  selectedMachineOrderStatus = 'none',
  onMachineChange,
  submitting = false,
  compactMode = false,
  onToggleCompactMode,
}) {
  const [description, setDescription] = useState('')
  const [eventStartTime, setEventStartTime] = useState(() => new Date().toTimeString().slice(0, 5))

  useEffect(() => {
    if (open) return
    setDescription('')
    setEventStartTime(new Date().toTimeString().slice(0, 5))
  }, [open])

  const canSubmit = useMemo(
    () => description.trim().length > 0 && Boolean(selectedMachineId),
    [description, selectedMachineId],
  )

  const orderStatusUi = useMemo(() => {
    if (selectedMachineOrderStatus === 'closed') {
      return {
        label: 'Orden cerrada',
        hint: 'La novedad se registrará sobre la última orden cerrada de esta máquina.',
        className: 'border-amber-200 bg-amber-50 text-amber-900',
      }
    }
    if (selectedMachineOrderStatus === 'active' || selectedMachineOrderStatus === 'open') {
      return {
        label: 'Orden activa',
        hint: 'La novedad se registrará sobre la orden activa de esta máquina.',
        className: 'border-purple-200 bg-purple-50 text-purple-900',
      }
    }
    return {
      label: 'Sin orden identificada',
      hint: 'Si existe setup en el turno, se usará la última orden registrada para esta máquina.',
      className: 'border-slate-200 bg-slate-50 text-slate-800',
    }
  }, [selectedMachineOrderStatus])

  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit?.({
      machineId: selectedMachineId,
      description,
      eventTime: eventStartTime,
      eventEndTime: null,
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 px-4 pb-4 pt-12 backdrop-blur-sm sm:items-center">
      <div className="premium-card w-full max-w-xl rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-purple-700">Nueva novedad</p>
            <h2 className="text-2xl font-semibold text-slate-900">Registrar evento</h2>
          </div>
          <div className="flex items-center gap-2">
            
            <button onClick={onClose} type="button" className="premium-btn-danger rounded-2xl p-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Hora de inicio</span>
              <input
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
                className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} premium-input w-full rounded-2xl px-4`}
              />
            </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Máquina del evento</span>
            <div className="relative">
              <select
                value={selectedMachineId}
                onChange={(event) => onMachineChange?.(event.target.value)}
                className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} premium-input w-full appearance-none rounded-2xl px-4 pr-12`}
              >
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id} className="bg-white text-purple-900">
                    {machine.code} - {machine.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs ${orderStatusUi.className}`}>
              <p className="font-semibold uppercase tracking-[0.08em]">{orderStatusUi.label}</p>
              <p className="mt-1 leading-5">{orderStatusUi.hint}</p>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Descripción del suceso</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className={`${compactMode ? 'text-lg py-4' : 'text-base py-3'} premium-input w-full rounded-2xl px-4`}
              placeholder="Ej. Reviente de materia prima"
            />
          </label>

          <button
            type="button"
            onClick={onClose}
            className={`premium-btn-iniciado inline-flex items-center justify-center gap-2 rounded-2xl px-5 font-semibold ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </button>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`premium-btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Guardar novedad
          </button>
        </form>
      </div>
    </div>
  )
}
