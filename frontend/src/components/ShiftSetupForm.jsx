import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2, Smartphone, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'


const PROCESS_PHOTO_CATEGORIES = [
  'img_materias_primas',
  'img_condiciones_proceso',
  'img_temp_secadores',
  'img_extraccion_adhesivo',
  'img_tiempo_paradas_turno_maquina',
]

function extractEntryTitle(entry) {
  if (entry && typeof entry === 'object' && typeof entry.title === 'string') {
    return entry.title
  }
  return ''
}

function normalizeExistingEntries(items, sourceCategory) {
  if (!Array.isArray(items)) return []
  return items.map((entry) => ({
    file: entry,
    title: extractEntryTitle(entry),
    sourceCategory,
    isExisting: true,
  }))
}

function buildRetainedPayload(items) {
  const payload = {
    img_materias_primas: [],
    img_condiciones_proceso: [],
    img_temp_secadores: [],
    img_extraccion_adhesivo: [],
    img_tiempo_paradas_turno_maquina: [],
  }

  items.forEach((entry) => {
    if (!entry || !entry.isExisting) return
    const entryFile = entry.file ?? entry
    const category = PROCESS_PHOTO_CATEGORIES.includes(entry.sourceCategory)
      ? entry.sourceCategory
      : 'img_condiciones_proceso'
    payload[category].push(entryFile)
  })

  return payload
}

function sanitizeFileNamePart(value) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return normalized || 'foto'
}

function buildLocalPhotoName(title, file) {
  const originalName = file?.name || ''
  const originalExtension = originalName.includes('.') ? originalName.split('.').pop() : ''
  const extension = originalExtension || (file?.type === 'image/png' ? 'png' : 'jpg')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  return `${sanitizeFileNamePart(title)}-${stamp}.${extension}`
}

function renameFile(file, nextName) {
  if (!file || file.name === nextName) return file
  return new File([file], nextName, {
    type: file.type || 'image/jpeg',
    lastModified: file.lastModified || Date.now(),
  })
}



function ImageUpload({ label, required, value, onChange, compactMode }) {
  const [draftTitle, setDraftTitle] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null)
  const [localSaveStatus, setLocalSaveStatus] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [cropRect, setCropRect] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const imgRef = useRef(null)
  const cropContainerRef = useRef(null)
  const [aspectPreset, setAspectPreset] = useState('free')

  const savedEntries = Array.isArray(value) ? value : []

  function handleFiles(e, { openCropAfterLoad = false } = {}) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const first = files[0]

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }

    const nextPreviewUrl = URL.createObjectURL(first)
    setPendingFile(first)
    setPendingPreviewUrl(nextPreviewUrl)
    setDraftTitle('')
    setCropPos({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setLocalSaveStatus('')
    setShowCropper(openCropAfterLoad)
    e.target.value = ''
  }

  function openCropper() {
    if (!pendingPreviewUrl) return
    // initialize cropRect with aspect preset if any
    if (aspectPreset && aspectPreset !== 'free' && imgRef.current) {
      const img = imgRef.current
      const w = img.width || 600
      const h = img.height || 360
      const ar = Number(aspectPreset)
      let cw = w
      let ch = Math.round(w / ar)
      if (ch > h) {
        ch = h
        cw = Math.round(h * ar)
      }
      const x = Math.round((w - cw) / 2)
      const y = Math.round((h - ch) / 2)
      setCropRect({ x, y, w: cw, h: ch })
    } else {
      setCropRect(null)
    }
    setShowCropper(true)
  }

  function onCropMouseDown(e) {
    if (!cropContainerRef.current || !imgRef.current) return
    setIsDragging(true)
    const rect = cropContainerRef.current.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    setCropRect({ x: startX, y: startY, w: 0, h: 0 })
  }

  function onCropMouseMove(e) {
    if (!isDragging || !cropRect || !cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let x = Math.min(cropRect.x, mx)
    let y = Math.min(cropRect.y, my)
    let w = Math.abs(mx - cropRect.x)
    let h = Math.abs(my - cropRect.y)
    if (aspectPreset && aspectPreset !== 'free') {
      const ar = Number(aspectPreset)
      if (w / Math.max(h, 1) > ar) {
        // width too big -> adjust width
        w = Math.round(h * ar)
      } else {
        // height too big or correct -> adjust height
        h = Math.round(w / (ar || 1))
      }
      // keep within bounds
      if (x + w > rect.width) w = Math.max(1, rect.width - x)
      if (y + h > rect.height) h = Math.max(1, rect.height - y)
    }
    setCropRect({ x, y, w, h })
  }

  function onCropMouseUp() {
    setIsDragging(false)
  }
  function onCropComplete(croppedArea, croppedAreaPixels) {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  async function applyCrop() {
    if (!croppedAreaPixels || !pendingPreviewUrl || !pendingFile) {
      setShowCropper(false)
      return
    }

    // create image element
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = pendingPreviewUrl
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
    })

    const { width: sw, height: sh, x: sx, y: sy } = croppedAreaPixels

    // draw cropped area to canvas
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    // Resize to max dimension
    const MAX_DIM = 1600
    let targetW = sw
    let targetH = sh
    if (Math.max(sw, sh) > MAX_DIM) {
      if (sw >= sh) {
        targetW = MAX_DIM
        targetH = Math.round((MAX_DIM * sh) / sw)
      } else {
        targetH = MAX_DIM
        targetW = Math.round((MAX_DIM * sw) / sh)
      }
    }

    const outCanvas = document.createElement('canvas')
    outCanvas.width = targetW
    outCanvas.height = targetH
    const outCtx = outCanvas.getContext('2d')
    outCtx.drawImage(canvas, 0, 0, sw, sh, 0, 0, targetW, targetH)

    const blob = await new Promise((res) => outCanvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob) {
      setShowCropper(false)
      return
    }

    const croppedFile = new File([blob], pendingFile.name || 'cropped.jpg', { type: blob.type })

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }
    const newUrl = URL.createObjectURL(croppedFile)
    setPendingFile(croppedFile)
    setPendingPreviewUrl(newUrl)
    setLocalSaveStatus('')
    setShowCropper(false)
  }

  async function handleSavePendingPhoto() {
    if (!pendingFile) return
    const title = draftTitle.trim()
    if (!title) return

    const fileToSave = renameFile(pendingFile, buildLocalPhotoName(title, pendingFile))
    setLocalSaveStatus('saving')
    const localSaveResult = await saveFileToDevice(fileToSave)
    if (localSaveResult.method === 'cancelled') {
      setLocalSaveStatus('cancelled')
      return
    }
    setLocalSaveStatus(localSaveResult.ok ? 'saved' : 'manual')

    onChange([
      ...savedEntries,
      {
        file: fileToSave,
        title,
        sourceCategory: 'img_condiciones_proceso',
        isExisting: false,
      },
    ])
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
      setPendingPreviewUrl(null)
    }
    setPendingFile(null)
    setDraftTitle('')
  }

  function handleRemoveSaved(index) {
    onChange(savedEntries.filter((_, currentIndex) => currentIndex !== index))
  }

  function resolvePreview(file) {
    if (file && typeof file === 'object' && typeof file.url === 'string' && file.url.trim()) {
      return file.url
    }
    if (typeof file === 'string' && file.trim()) {
      return file
    }
    return null
  }

  const canSavePendingPhoto = Boolean(pendingFile) && draftTitle.trim().length > 0
  const pendingPreview = pendingPreviewUrl

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl)
      }
    }
  }, [pendingPreviewUrl])

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <div className="rounded-3xl border border-dashed border-sky-400/25 bg-sky-400/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sky-900/70">
          <Camera className="h-4 w-4" />
          <p className="text-xs">Agrega fotos al formulario y confirma todo al final del turno.</p>
        </div>

        <div className="mb-3 grid gap-2">
          <span className="text-xs font-medium text-slate-600">Título de la imagen <span className="text-rose-500">*</span></span>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            disabled={!pendingFile}
            placeholder={pendingFile ? 'Ej. Tablero de control al inicio' : 'Primero toma o carga una foto'}
            className={`${compactMode ? 'h-12 text-base' : 'h-10 text-sm'} w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
          />
          {pendingFile ? (
            <p className="text-xs text-slate-500">El título es obligatorio antes de guardar la imagen.</p>
          ) : null}
          {localSaveStatus === 'saving' ? (
            <p className="text-xs font-medium text-sky-700">Guardando copia local en este dispositivo...</p>
          ) : null}
          {localSaveStatus === 'saved' ? (
            <p className="text-xs font-medium text-emerald-700">Copia local guardada en este dispositivo.</p>
          ) : null}
          {localSaveStatus === 'manual' ? (
            <p className="text-xs font-medium text-amber-700">El navegador abrió una descarga o selector para guardar la copia local.</p>
          ) : null}
          {localSaveStatus === 'cancelled' ? (
            <p className="text-xs font-medium text-amber-700">No se guardó la copia local. Presiona Guardar foto para intentarlo otra vez.</p>
          ) : null}
        </div>

        {pendingFile ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-sky-400/30 bg-sky-50">
            {pendingPreview ? <img ref={imgRef} src={pendingPreview} alt="Vista previa pendiente" className="h-40 w-full object-cover" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm text-slate-700">
              <span className="font-medium">Foto pendiente por guardar</span>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button type="button" onClick={openCropper} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800">Recortar</button>
                <button
                  type="button"
                  onClick={handleSavePendingPhoto}
                  disabled={!canSavePendingPhoto || localSaveStatus === 'saving'}
                  className={`inline-flex items-center justify-center rounded-xl px-3 py-2 font-semibold transition ${canSavePendingPhoto && localSaveStatus !== 'saving' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}
                >
                  {localSaveStatus === 'saving' ? 'Guardando...' : 'Guardar foto'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showCropper ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3">
            <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4">
              <div className="mb-3 text-sm font-medium">Ajusta el recorte y el zoom</div>
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setAspectPreset('free')} className={`rounded-xl px-3 py-1 ${aspectPreset==='free'?'bg-slate-200':'bg-slate-100'}`}>Libre</button>
                <button type="button" onClick={() => setAspectPreset('1')} className={`rounded-xl px-3 py-1 ${aspectPreset==='1'?'bg-slate-200':'bg-slate-100'}`}>1:1</button>
                <button type="button" onClick={() => setAspectPreset((4/3).toString())} className={`rounded-xl px-3 py-1 ${aspectPreset===(4/3).toString()?'bg-slate-200':'bg-slate-100'}`}>4:3</button>
                <button type="button" onClick={() => setAspectPreset((16/9).toString())} className={`rounded-xl px-3 py-1 ${aspectPreset===(16/9).toString()?'bg-slate-200':'bg-slate-100'}`}>16:9</button>
              </div>

              <div className="relative h-[min(58vh,360px)] min-h-64 w-full bg-slate-50">
                <Cropper
                  image={pendingPreviewUrl}
                  crop={cropPos}
                  zoom={zoom}
                  aspect={aspectPreset === 'free' ? undefined : Number(aspectPreset)}
                  onCropChange={setCropPos}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-sm">Zoom</label>
                <input className="min-w-0 flex-1" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                <div className="flex w-full justify-end gap-2 sm:ml-auto sm:w-auto">
                  <button type="button" onClick={() => setShowCropper(false)} className="rounded-xl bg-slate-100 px-3 py-2">Cancelar</button>
                  <button type="button" onClick={applyCrop} className="rounded-xl bg-emerald-500 px-3 py-2 text-white">Aplicar recorte</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {savedEntries.length > 0 ? (
          <div className="mb-4 grid gap-2">
            {savedEntries.map((entry, index) => {
              const entryValue = entry?.file ?? entry
              const entryTitle = typeof entry === 'object' && entry !== null ? entry.title ?? '' : ''
              const entryPreview = resolvePreview(entryValue)
              return (
                <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {entryPreview && <img src={entryPreview} alt={`Vista previa ${index + 1}`} className="h-40 w-full object-cover" />}
                  <div className="flex items-center justify-between gap-3 p-3 text-sm text-slate-600">
                    <span className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> {entryTitle || `Foto ${index + 1}`}
                    </span>
                    <button type="button" onClick={() => handleRemoveSaved(index)} className="inline-flex items-center gap-1 text-rose-700">
                      <Trash2 className="h-4 w-4" /> Quitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="mb-4 rounded-2xl border border-sky-400/20 bg-white p-3 text-xs text-slate-600">
          Las fotos quedan en borrador dentro del formulario y solo se guardan cuando presionas confirmar. La vista previa se muestra desde el archivo local del dispositivo, no desde Cloudinary.
        </div>

        {/* Upload buttons - Camera and Gallery */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-100 px-4 font-semibold text-blue-900 transition hover:bg-blue-200 flex-1 ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}>
            <Camera className="h-4 w-4" />
            Tomar foto
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e, { openCropAfterLoad: true })} />
          </label>
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 font-semibold text-slate-900 transition hover:bg-slate-200 flex-1 ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}>
            <ImagePlus className="h-4 w-4" />
            Galería
            <input type="file" accept="image/*" className="hidden" onChange={handleFiles} />
          </label>
        </div>
      </div>
    </div>
  )
}

export default function ShiftSetupForm({
  shift,
  machineName,
  setupId = null,
  initialSetup,
  prefillMachineStatus = '',
  prefillMachineStatusDescription = '',
  lockStatusStep = false,
  isEditing = false,
  compactMode = false,
  onToggleCompactMode,
  onBack,
  onComplete,
  submitting,
  setSubmitting,
}) {
  const [machineStatus, setMachineStatus] = useState('')
  const [wocoNumber, setWocoNumber] = useState('')
  const [refOrder, setRefOrder] = useState('')
  const [meters, setMeters] = useState('')
  const [productToLaminate, setProductToLaminate] = useState('')
  const [machineStatusDescription, setMachineStatusDescription] = useState('')
  const [processPhotos, setProcessPhotos] = useState([])
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (initialSetup) {
      setMachineStatus(initialSetup.machine_status ?? '')
      const woDigits = (initialSetup.work_order || '').replace(/^WOCO/i, '')
      setWocoNumber(woDigits)
      setRefOrder(initialSetup.ref_order ?? '')
      setMeters(initialSetup.meters_to_produce ?? '')
      setProductToLaminate(initialSetup.product_to_laminate ?? '')
      setMachineStatusDescription(initialSetup.machine_status_description ?? '')

      const existingPhotos = [
        ...normalizeExistingEntries(initialSetup.img_materias_primas, 'img_materias_primas'),
        ...normalizeExistingEntries(initialSetup.img_condiciones_proceso, 'img_condiciones_proceso'),
        ...normalizeExistingEntries(initialSetup.img_temp_secadores, 'img_temp_secadores'),
        ...normalizeExistingEntries(initialSetup.img_extraccion_adhesivo, 'img_extraccion_adhesivo'),
        ...normalizeExistingEntries(
          initialSetup.img_tiempo_paradas_turno_maquina,
          'img_tiempo_paradas_turno_maquina',
        ),
      ]
      setProcessPhotos(existingPhotos)
      return
    }

    const normalizedPrefillStatus =
      prefillMachineStatus === 'en_produccion' ||
      prefillMachineStatus === 'en_mantenimiento' ||
      prefillMachineStatus === 'fuera_de_servicio'
        ? prefillMachineStatus
        : ''
    setMachineStatus(normalizedPrefillStatus)
    setMachineStatusDescription(normalizedPrefillStatus ? prefillMachineStatusDescription || '' : '')
    setWocoNumber('')
    setRefOrder('')
    setMeters('')
    setProductToLaminate('')
    setProcessPhotos([])
  }, [initialSetup, prefillMachineStatus, prefillMachineStatusDescription])

  const isProduccion = machineStatus === 'en_produccion'
  const requiresStatusDescription = machineStatus === 'en_mantenimiento' || machineStatus === 'fuera_de_servicio'

  const wizardSteps = useMemo(() => {
    if (isProduccion) {
      return [
        {
          key: 'order',
          title: 'Datos de la orden',
          description: 'Registra WOCO, referencia y metros de esta orden.',
        },
        {
          key: 'photos',
          title: 'Fotos de proceso',
          description: 'Agrega las fotos que quieras con su descripción antes de continuar.',
        },
      ]
    }

    return [
      {
        key: 'description',
        title: 'Descripción',
        description: 'Explica la condición actual de la máquina.',
      },
    ]
  }, [isProduccion])

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, wizardSteps.length - 1))
  }, [wizardSteps])

  const canSubmit = useMemo(() => {
    if (!machineStatus) return false
    if (isProduccion) {
      return (
        wocoNumber.trim().length > 0 &&
        refOrder.trim().length > 0 &&
        meters.trim().length > 0 &&
        processPhotos.length > 0
      )
    }
    if (requiresStatusDescription) {
      return machineStatusDescription.trim().length > 0
    }
    return true
  }, [
    wocoNumber,
    refOrder,
    meters,
    processPhotos.length,
    isProduccion,
    requiresStatusDescription,
    machineStatusDescription,
  ])

  const currentStepKey = wizardSteps[currentStep]?.key ?? 'order'
  const isLastStep = currentStep === wizardSteps.length - 1

  const currentStepValid = useMemo(() => {
    if (currentStepKey === 'order') {
      return wocoNumber.trim().length > 0 && refOrder.trim().length > 0 && meters.trim().length > 0
    }
    if (currentStepKey === 'photos') {
      return processPhotos.length > 0
    }
    if (currentStepKey === 'description') {
      return machineStatusDescription.trim().length > 0
    }
    return true
  }, [currentStepKey, wocoNumber, refOrder, meters, processPhotos.length, machineStatusDescription, canSubmit])

  const completedStepCount = useMemo(() => {
    return wizardSteps.reduce((count, step) => {
      if (step.key === 'order' && wocoNumber.trim() && refOrder.trim() && meters.trim()) return count + 1
      if (step.key === 'photos' && processPhotos.length > 0) return count + 1
      if (step.key === 'description' && machineStatusDescription.trim()) return count + 1
      return count
    }, 0)
  }, [wizardSteps, wocoNumber, refOrder, meters, processPhotos.length, machineStatusDescription])

  function handleNextStep() {
    if (!currentStepValid || isLastStep) return
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1))
  }

  function handlePreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  function handleFormSubmit(e) {
    e.preventDefault()

    // Protect against accidental submit (Enter key or mobile behavior) before final step.
    if (!isLastStep) {
      if (currentStepValid) handleNextStep()
      return
    }
  }

  async function handleSubmit() {
    if (!isLastStep) return

    if (!canSubmit || submitting) return

    setSubmitting(true)
    try {
      const fd = new FormData()
      if (setupId) {
        fd.append('setup_id', setupId)
      }
      fd.append('machine_status', machineStatus)
      if (requiresStatusDescription) {
        fd.append('machine_status_description', machineStatusDescription.trim())
      }
      if (isProduccion) {
        fd.append('work_order', `WOCO${wocoNumber.trim()}`)
        fd.append('ref_order', refOrder.trim())
        fd.append('meters_to_produce', meters.trim())
        fd.append('product_to_laminate', productToLaminate.trim())

        const retainedPhotos = buildRetainedPayload(processPhotos)
        fd.append('retain_img_materias_primas', JSON.stringify(retainedPhotos.img_materias_primas))
        fd.append('retain_img_condiciones_proceso', JSON.stringify(retainedPhotos.img_condiciones_proceso))
        fd.append('retain_img_temp_secadores', JSON.stringify(retainedPhotos.img_temp_secadores))
        fd.append('retain_img_extraccion_adhesivo', JSON.stringify(retainedPhotos.img_extraccion_adhesivo))
        fd.append(
          'retain_img_tiempo_paradas_turno_maquina',
          JSON.stringify(retainedPhotos.img_tiempo_paradas_turno_maquina),
        )

        processPhotos.forEach((entry) => {
          const entryFile = entry?.file ?? entry
          const entryTitle = typeof entry === 'object' && entry !== null ? entry.title ?? '' : ''
          if (entryFile instanceof File) {
            fd.append('img_condiciones_proceso', entryFile)
            fd.append('img_condiciones_proceso_title', entryTitle.trim())
          }
        })
      }

      await onComplete(fd)
    } finally {
      setSubmitting(false)
    }
  }

  // Generate report client-side using the photos currently attached in the form.
  function generateReportClientSide() {
    // Build list of image URLs (object URLs for Files)
    const urls = processPhotos.map((entry) => {
      const entryFile = entry?.file ?? entry
      if (entryFile instanceof File) return URL.createObjectURL(entryFile)
      if (entryFile && typeof entryFile === 'object' && typeof entryFile.url === 'string') return entryFile.url
      if (typeof entryFile === 'string') return entryFile
      return null
    }).filter(Boolean)

    const title = `Informe - ${machineName || ''} - Turno ${shift?.shift_number || ''}`
    const htmlParts = [
      '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>',
      '<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.photo-card{break-inside:avoid;page-break-inside:avoid;border:1px solid #ccc;padding:6px}.photo-card h3{font-size:13px;margin:0 0 6px}.photo{display:block;width:100%;height:230px;object-fit:cover;border:1px solid #ccc}@media print{body{padding:0}.photos{grid-template-columns:repeat(2,1fr);gap:8px}.photo{height:210px}}</style>',
      '</head><body>' ,
      `<h1>${title}</h1>`,
      `<p><strong>Máquina:</strong> ${machineName || 'N/A'}</p>`,
      `<p><strong>WOCO:</strong> ${wocoNumber ? 'WOCO' + wocoNumber : 'N/A'}</p>`,
      `<p><strong>Referencia:</strong> ${refOrder || 'N/A'}</p>`,
      `<p><strong>Metros:</strong> ${meters || 'N/A'}</p>`,
      `<hr/>`,
      '<div class="photos">',
    ]

    urls.forEach((u, idx) => {
      const caption = (processPhotos[idx] && processPhotos[idx].title) ? processPhotos[idx].title : `Foto ${idx + 1}`
      htmlParts.push(`<div class="photo-card"><h3>${caption}</h3><img class="photo" src="${u}" /></div>`)
    })

    htmlParts.push('</div></body></html>')
    const content = htmlParts.join('\n')
    const w = window.open('', '_blank')
    if (!w) {
      alert('No se pudo abrir ventana para generar el informe. Permite popups y vuelve a intentar.')
      return
    }
    w.document.open()
    w.document.write(content)
    w.document.close()
    // Give the window a moment to render images, then print
    w.focus()
    setTimeout(() => {
      try {
        w.print()
      } catch (err) {
        console.warn('Print failed', err)
      }
      // Revoke object URLs created earlier
      urls.forEach((u) => { if (u.startsWith('blob:')) URL.revokeObjectURL(u) })
    }, 800)
  }

  return (
    <main className="premium-shell px-3 py-5 text-slate-900 sm:px-4 sm:py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className={`premium-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 font-semibold ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </button>
            <button
              type="button"
              onClick={onToggleCompactMode}
              className={`premium-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 font-semibold ${compactMode ? 'h-12 text-base' : 'h-10 text-sm'}`}
            >
              <Smartphone className="h-4 w-4" />
              {compactMode ? 'Compacto activo' : 'Modo compacto'}
            </button>
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-700/80">Inicio de turno</p>
          <h1 className="text-2xl font-semibold text-slate-900">{machineName}</h1>
          {isEditing ? <p className="mt-1 text-sm font-medium text-cyan-700">Estás editando información guardada para esta máquina.</p> : null}
          
        </div>

        <form onSubmit={handleFormSubmit} className="grid gap-5">
          <section className="premium-card rounded-3xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-sky-700/80">Asistente guiado</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Paso {currentStep + 1} de {wizardSteps.length}</h2>
                <p className="mt-1 text-sm text-slate-600">{wizardSteps[currentStep]?.description}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
                {completedStepCount} / {wizardSteps.length} pasos listos
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {wizardSteps.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = index < currentStep || (index === currentStep && currentStepValid)
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      if (index <= currentStep) setCurrentStep(index)
                    }}
                    className={`rounded-2xl px-4 py-3 text-left transition ${
                      isActive
                        ? 'premium-btn-primary'
                        : isCompleted
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'premium-btn-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em]">
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span className="font-semibold">0{index + 1}</span>}
                      <span>{step.title}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {currentStepKey === 'description' ? (
            <section className="premium-card rounded-3xl p-4 sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Descripción del estado</h2>
              <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Esta máquina no está en producción, por lo que no se solicitan datos de orden ni fotos de proceso en este inicio.
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Detalle de la condición de la máquina <span className="text-rose-400">*</span>
                </span>
                <textarea
                  value={machineStatusDescription}
                  onChange={(e) => setMachineStatusDescription(e.target.value)}
                  placeholder="Describe el estado actual, causa y observaciones relevantes"
                  rows={4}
                  className="premium-input w-full rounded-2xl px-4 py-3 text-base placeholder:text-slate-500"
                />
              </label>
            </section>
          ) : null}

          {currentStepKey === 'order' ? (
            <section className="premium-card rounded-3xl p-4 sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Datos de la orden de producción</h2>
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Orden de trabajo <span className="text-rose-400">*</span>
                  </span>
                  <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-sky-400/50 focus-within:ring-2 focus-within:ring-sky-400/20">
                    <span className="shrink-0 bg-sky-400/15 px-4 py-3 text-sm font-bold text-sky-800">WOCO</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={wocoNumber}
                      onChange={(e) => setWocoNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 0111981"
                    className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} flex-1 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-500`}
                    />
                  </div>
                  {wocoNumber ? (
                    <p className="text-xs text-slate-500">
                      Orden completa: <span className="font-mono text-sky-700">WOCO{wocoNumber}</span>
                    </p>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Referencia (REF) <span className="text-rose-400">*</span>
                  </span>
                  <input
                    type="text"
                    value={refOrder}
                    onChange={(e) => setRefOrder(e.target.value)}
                    placeholder="Ej. LN80-P4-G55S_1520"
                    className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} premium-input w-full rounded-2xl px-4 placeholder:text-slate-500`}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Metros programados (m²) <span className="text-rose-400">*</span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={meters}
                    onChange={(e) => setMeters(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 70000"
                    className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} premium-input w-full rounded-2xl px-4 placeholder:text-slate-500`}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Material a laminar (MEX)</span>
                  <input
                    type="text"
                    value={productToLaminate}
                    onChange={(e) => setProductToLaminate(e.target.value)}
                    placeholder="Ej. 15MX3000ML"
                    className={`${compactMode ? 'h-14 text-lg' : 'h-12 text-base'} premium-input w-full rounded-2xl px-4 placeholder:text-slate-500`}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {currentStepKey === 'photos' ? (
            <section className="premium-card rounded-3xl p-4 sm:p-5">
              <h2 className="mb-1 text-base font-semibold text-slate-900">Fotografías de condiciones de proceso</h2>
              

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fotos guardadas</p>
                      <div className="mt-3 grid gap-2">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span>Total fotos</span>
                          <span className="font-semibold text-slate-900">{processPhotos.length}</span>
                        </div>
                        {processPhotos.map((entry, index) => {
                          const title = typeof entry === 'object' && entry !== null ? entry.title ?? '' : ''
                          return (
                            <div key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              {title || `Foto ${index + 1}`}
                            </div>
                          )
                        })}
                      </div>
                    </div>

              <ImageUpload
                label="Fotos de condiciones de proceso"
                required={true}
                value={processPhotos}
                onChange={setProcessPhotos}
                compactMode={compactMode}
              />
            </section>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={currentStep === 0 ? onBack : handlePreviousStep}
              className={`premium-btn-secondary inline-flex items-center justify-center gap-3 rounded-2xl px-5 font-semibold ${compactMode ? 'h-14 text-base' : 'h-12 text-sm'}`}
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 0 ? 'Salir del asistente' : 'Volver al paso anterior'}
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={`premium-btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {isEditing ? 'Confirmar cambios' : 'Confirmar inicio de turno'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!currentStepValid}
                className={`premium-btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${compactMode ? 'h-16 text-lg' : 'h-14 text-base'}`}
              >
                Continuar
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}

// Helper: save a File to user's device using File System Access API if available,
// otherwise trigger a download via an anchor with `download` attribute.
async function saveFileToDevice(file) {
  if (!file) return { ok: false, method: 'none' }

  // Prefer modern File System Access API when available (desktop Chromium, Edge, etc.)
  if (window.showSaveFilePicker) {
    try {
      const opts = {
        suggestedName: file.name,
        types: [
          {
            description: 'Image file',
            accept: { [file.type || 'image/*']: ['.png', '.jpg', '.jpeg', '.webp'] },
          },
        ],
      }
      const handle = await window.showSaveFilePicker(opts)
      const writable = await handle.createWritable()
      await writable.write(file)
      await writable.close()
      return { ok: true, method: 'file-picker' }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { ok: false, method: 'cancelled' }
      }
      console.warn('showSaveFilePicker error, falling back to download', err)
    }
  }

  if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: file.name,
      })
      return { ok: true, method: 'share' }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { ok: false, method: 'cancelled' }
      }
      console.warn('navigator.share error, falling back to download', err)
    }
  }

  // Fallback: create blob URL and force download
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name || 'photo.jpg'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, method: 'download' }
}
