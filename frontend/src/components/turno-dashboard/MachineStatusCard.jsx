import { CheckCircle2, PencilLine, PlayCircle } from 'lucide-react'
import { MACHINE_STATUS_META, getMachineStatusKey } from '../../utils/machineStatus'

export default function MachineStatusCard({ machine, selected, onSelect, onStart, onOpenNewOrder, onEditStatus, onOpenEvents, onViewDetails, isStarted = false, orderStatus = 'none' }) {
  const statusKey = getMachineStatusKey(machine)
  const meta = MACHINE_STATUS_META[statusKey] ?? MACHINE_STATUS_META.sin_registro

  // Order is actively running — button should have no functionality
  const orderIsActive = isStarted && orderStatus === 'active'
  // Order was closed — allow editing info/photos
  const orderIsClosed = isStarted && orderStatus === 'closed'
  const canOpenEvents = orderIsActive

  return (
    <article
      onClick={onSelect}
      className={`premium-card cursor-pointer rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${selected ? 'border-purple-400 ring-4 ring-purple-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{machine.code}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{machine.name}</h3>
          {machine.area_name ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700">{machine.area_name}</p>
          ) : null}
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {machine.current_status_description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{machine.current_status_description}</p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">Último estado conocido de la máquina.</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {machine.last_activity_at ? `Actualizado ${new Date(machine.last_activity_at).toLocaleString()}` : 'Sin historial'}
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onViewDetails?.()
          }}
          className="premium-btn-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
        >
          <CheckCircle2 className="h-6 w-8" />
          Ver detalle
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {orderIsClosed ? null : (
          <button
            type="button"
            onClick={orderIsActive ? undefined : (event) => {
              event.stopPropagation()
              onStart()
            }}
            disabled={orderIsActive}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              orderIsActive
                ? 'cursor-not-allowed bg-blue text-white opacity-80'
                : isStarted
                ? 'premium-btn-iniciado'
                : 'premium-btn-primary'
            }`}
          >
            {isStarted ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {isStarted ? 'Turno iniciado' : 'Iniciar turno'}
          </button>
        )}
        
      </div>

      {orderIsClosed ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpenNewOrder?.()
          }}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-purple bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <PlayCircle className="h-4 w-4" />
          Abrir nueva orden en esta máquina
        </button>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onEditStatus()
        }}
        className="premium-btn-change mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
      >
        <PencilLine className="h-4 w-4" />
        Cambiar estado
      </button>
    </article>
  )
}
