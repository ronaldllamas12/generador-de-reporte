import { Smartphone } from 'lucide-react'

export default function CompactModeToggle({ compactMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
        compactMode
          ? 'border-sky-400/45 bg-sky-400/15 text-sky-900 hover:bg-sky-400/20'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Smartphone className="h-4 w-4" />
      {compactMode ? 'Modo compacto activo' : 'Activar modo compacto'}
    </button>
  )
}