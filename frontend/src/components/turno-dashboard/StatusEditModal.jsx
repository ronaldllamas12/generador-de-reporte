import { MACHINE_STATUS_OPTIONS } from '../../utils/machineStatus'

export default function StatusEditModal({ open, machine, value, description, saving, onClose, onChangeValue, onChangeDescription, onSave }) {
  if (!open || !machine) return null

  const requiresDescription = value === 'en_mantenimiento' || value === 'fuera_de_servicio'
  const isNeutral = value === 'sin_registro'
  const canSave = !saving && !isNeutral && (!requiresDescription || description.trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 pb-4 pt-12 backdrop-blur-sm sm:items-center">
      <div className="premium-card w-full max-w-xl rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sky-700/80">Modificar estado</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {machine.code} - {machine.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="premium-btn-secondary rounded-2xl px-3 py-2 text-sm font-semibold">
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Estado actual</span>
            <select
              value={value}
              onChange={(event) => onChangeValue(event.target.value)}
              className="premium-input h-12 w-full rounded-2xl px-4"
            >
              {MACHINE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Descripción {requiresDescription ? <span className="text-rose-500">*</span> : null}
            </span>
            <textarea
              value={description}
              onChange={(event) => onChangeDescription(event.target.value)}
              rows={4}
              placeholder="Describe brevemente por qué la máquina quedó en este estado"
              className="premium-input w-full rounded-2xl px-4 py-3 placeholder:text-slate-500"
            />
            {requiresDescription ? (
              <p className="text-xs text-rose-600">La descripción es obligatoria para mantenimiento y fuera de servicio.</p>
            ) : null}
            {isNeutral ? (
              <p className="text-xs text-amber-600">Selecciona producción, mantenimiento o fuera de servicio para guardar.</p>
            ) : null}
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onClose} className="premium-btn-secondary inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold">
              Cancelar
            </button>
            <button type="button" onClick={onSave} disabled={!canSave} className="premium-btn-primary inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Guardando...' : 'Confirmar cambio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
