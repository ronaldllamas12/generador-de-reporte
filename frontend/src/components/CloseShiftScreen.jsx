import { CheckCircle2, Download, FileText, ListChecks, Loader2, Smartphone } from 'lucide-react'
import { useMemo } from 'react'

function normalizePhoto(item) {
  if (!item) return { url: '', title: '' }
  if (typeof item === 'string') return { url: item, title: '' }
  if (typeof item === 'object') {
    return {
      url: item.url || '',
      title: item.title || '',
    }
  }
  return { url: '', title: '' }
}

function PhotoList({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <section className="premium-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => {
          const { url, title } = normalizePhoto(item)
          return (
            <article key={`${label}-${index}`} className="premium-panel overflow-hidden rounded-2xl">
              {url ? <img src={url} alt={title || `${label} ${index + 1}`} className="h-44 w-full object-cover" /> : null}
              <div className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium text-slate-800">{title || `Foto ${index + 1}`}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
export default function CloseShiftScreen({
  shift,
  events,
  setups = [],
  generating,
  reportUrl,
  compactMode = false,
  onToggleCompactMode,
  onFinalize,
  onBack,
  onGoToStartMenu,
  onAddMoreEvents,
  onAddMorePhotos,
  onStartNextOrder,
}) {
  const visibleEvents = useMemo(() => events, [events])
  const setupPhotoGroups = useMemo(
    () =>
      setups.flatMap((setup) => {
        const orderLabel = setup.work_order || setup.ref_order || setup.machine_name || 'Orden sin identificar'
        return [
          ['Materias primas', setup.img_materias_primas],
          ['Condiciones de proceso', setup.img_condiciones_proceso],
          ['Temperatura de secadores', setup.img_temp_secadores],
          ['Extracción de adhesivo', setup.img_extraccion_adhesivo],
          ['Paradas turno máquina', setup.img_tiempo_paradas_turno_maquina],
        ]
          .filter(([, items]) => Array.isArray(items) && items.length > 0)
          .map(([label, items]) => ({
            key: `${setup.id}-${label}`,
            label: `${orderLabel} - ${label}`,
            items,
          }))
      }),
    [setups],
  )

  return (
    <main className="premium-shell px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
      <section className={`mx-auto flex max-w-3xl flex-col ${compactMode ? 'gap-6 pb-28' : 'gap-5'}`}>
        <header className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-700">
                <ListChecks className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-700/80">Cierre de turno</p>
                <h1 className="text-2xl font-semibold text-slate-900">Cerrar turno y generar informe</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCompactMode}
              className={`premium-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 font-semibold ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}
            >
              <Smartphone className="h-4 w-4" />
              {compactMode ? 'Compacto activo' : 'Modo compacto'}
            </button>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Genera el informe directamente desde aquí. La foto de paradas se valida por cada máquina.
          </p>
        </header>

        <section className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="premium-panel rounded-2xl p-3 sm:p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operario</p>
              <p className="mt-2 text-lg font-medium text-slate-900">{shift.employee}</p>
            </div>
            <div className="premium-panel rounded-2xl p-3 sm:p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Máquina</p>
              <p className="mt-2 text-lg font-medium text-slate-900">{shift.machineName}</p>
            </div>
            <div className="premium-panel rounded-2xl p-3 sm:p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Área</p>
              <p className="mt-2 text-lg font-medium text-slate-900">{shift.area}</p>
            </div>
            <div className="premium-panel rounded-2xl p-3 sm:p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Eventos</p>
              <p className="mt-2 text-lg font-medium text-slate-900">{events.length}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0" />

          </div>

        </section>

        {setupPhotoGroups.length > 0 ? (
          <section className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Condiciones de proceso guardadas</p>
            <div className="mt-4 grid gap-4">
              {setupPhotoGroups.map((group) => (
                <PhotoList key={group.key} label={group.label} items={group.items} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="premium-card rounded-3xl p-4 backdrop-blur sm:p-5">
          <button
            type="button"
            onClick={onFinalize}
            disabled={generating}
            className={`premium-btn-primary inline-flex w-full items-center justify-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
          >
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
            Finalizar Turno y Generar Informe
          </button>

          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className={`premium-btn-secondary mt-4 inline-flex w-full items-center justify-center gap-3 rounded-2xl px-5 font-semibold ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
            >
              <Download className="h-5 w-5" />
              Descargar PDF generado
            </a>
          ) : null}


          <button
            type="button"
            onClick={onGoToStartMenu}
            className={`premium-btn-danger mt-3 inline-flex w-full items-center justify-center rounded-2xl px-5 font-semibold ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
          >
            Regresar al menú inicio de turno
          </button>

          <button
            type="button"
            onClick={onStartNextOrder}
            className={`premium-btn-secondary mt-3 inline-flex w-full items-center justify-center rounded-2xl px-5 font-semibold ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
          >
            Iniciar siguiente orden en esta máquina
          </button>
        </section>
      </section>
    </main>
  )
}
