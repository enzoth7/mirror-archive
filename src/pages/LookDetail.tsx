import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import type { Look } from '../lib/looks'
import { deleteLookWithAssets, fetchLookWithImages, updateLook, upsertLookImage, getAcceptedTypes } from '../lib/lookService'
import { useAuth } from '../lib/auth'


type LayoutMode = 'split' | 'stack'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type CanvasSource = HTMLImageElement | ImageBitmap

const EXPORT_WIDTH = 1600
const EXPORT_HEIGHT = 800
const EXPORT_MARGIN = 48
const EXPORT_GAP = 24
const EXPORT_FOOTER = 40
const EXPORT_BG = '#f6f2eb'
const EXPORT_SURFACE = '#fcf9f4'
const EXPORT_LINE = 'rgba(52, 45, 40, 0.18)'
const EXPORT_TEXT = 'rgba(52, 45, 40, 0.55)'

async function loadCanvasImage(url: string): Promise<CanvasSource> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Image load failed.')
  }
  const blob = await response.blob()
  if ('createImageBitmap' in window) {
    return await createImageBitmap(blob)
  }
  const objectUrl = URL.createObjectURL(blob)
  const img = new Image()
  img.decoding = 'async'
  img.src = objectUrl
  await img.decode()
  URL.revokeObjectURL(objectUrl)
  return img
}

function getSourceSize(source: CanvasSource) {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

function drawCoverImage(ctx: CanvasRenderingContext2D, source: CanvasSource, x: number, y: number, w: number, h: number) {
  const { width, height } = getSourceSize(source)
  if (!width || !height) return
  const scale = Math.max(w / width, h / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  const dx = x + (w - drawWidth) / 2
  const dy = y + (h - drawHeight) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(source, dx, dy, drawWidth, drawHeight)
  ctx.restore()
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  ctx.fillStyle = EXPORT_SURFACE
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = EXPORT_LINE
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  ctx.fillStyle = EXPORT_TEXT
  ctx.font = '12px "Work Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w / 2, y + h / 2)
}

export default function LookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [look, setLook] = useState<Look | null>(null)
  const [images, setImages] = useState<{ inspoUrl: string | null; myUrl: string | null }>({
    inspoUrl: null,
    myUrl: null
  })
  const [layout, setLayout] = useState<LayoutMode>('split')
  const [titleDraft, setTitleDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: 'info' | 'error' }>({
    open: false,
    message: '',
    variant: 'info'
  })

  const savedRef = useRef<{ title: string; notes: string }>({ title: '', notes: '' })
  const saveTimerRef = useRef<number | null>(null)
  const inspoInputRef = useRef<HTMLInputElement | null>(null)
const myInputRef = useRef<HTMLInputElement | null>(null)
  const savedIndicatorRef = useRef<number | null>(null)

const handlePickImage = async (kind: 'inspo' | 'me', file: File | null) => {
  if (!file) return
  if (!user || !look) {
    showToast('You need to be logged in.', 'error')
    return
  }

  const { signedUrl, error } = await upsertLookImage({
    userId: user.id,
    lookId: look.id,
    kind,
    file
  })

  if (error) {
    showToast(error, 'error')
    return
  }

  setImages((prev) => ({
    ...prev,
    ...(kind === 'inspo' ? { inspoUrl: signedUrl ?? prev.inspoUrl } : { myUrl: signedUrl ?? prev.myUrl })
  }))
}



  const showToast = (message: string, variant: 'info' | 'error' = 'error') => {
    setToast({ open: true, message, variant })
  }

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((current) => ({ ...current, open: false })), 2800)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  useEffect(() => {
    if (!id) {
      setError('Not found.')
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    fetchLookWithImages(id).then(({ look: fetchedLook, images: fetchedImages, error: fetchError }) => {
      if (!mounted) return
      if (fetchError) {
        setError(fetchError)
        setLoading(false)
        return
      }
      setLook(fetchedLook)
      setImages(fetchedImages)
      setTitleDraft(fetchedLook?.title ?? '')
      setNotesDraft(fetchedLook?.notes ?? '')
      savedRef.current = { title: fetchedLook?.title ?? '', notes: fetchedLook?.notes ?? '' }
      setSaveState('idle')
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    if (!look) return
    if (titleDraft === savedRef.current.title && notesDraft === savedRef.current.notes) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void handleSave()
    }, 600)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [titleDraft, notesDraft, look])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      if (savedIndicatorRef.current) window.clearTimeout(savedIndicatorRef.current)
    }
  }, [])

  const handleSave = async () => {
    if (!look) return
    setSaveState('saving')
    const { error: updateError } = await updateLook(look.id, {
      title: titleDraft,
      notes: notesDraft
    })
    if (updateError) {
      setSaveState('error')
      showToast(updateError, 'error')
      return
    }
    savedRef.current = { title: titleDraft, notes: notesDraft }
    setSaveState('saved')
    if (savedIndicatorRef.current) window.clearTimeout(savedIndicatorRef.current)
    savedIndicatorRef.current = window.setTimeout(() => setSaveState('idle'), 1200)
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    const { error: deleteError } = await deleteLookWithAssets(id)
    if (deleteError) {
      showToast(deleteError, 'error')
      setDeleting(false)
      return
    }
    setDeleting(false)
    navigate('/')
  }

  const handleExport = async () => {
    if (!look) return
    if (!images.inspoUrl && !images.myUrl) {
      showToast('Add a photo to export.', 'error')
      return
    }

    setExporting(true)
    try {
      const [inspoImage, myImage] = await Promise.all([
        images.inspoUrl ? loadCanvasImage(images.inspoUrl) : Promise.resolve(null),
        images.myUrl ? loadCanvasImage(images.myUrl) : Promise.resolve(null)
      ])

      const canvas = document.createElement('canvas')
      canvas.width = EXPORT_WIDTH
      canvas.height = EXPORT_HEIGHT
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not ready.')

      ctx.fillStyle = EXPORT_BG
      ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)

      const contentWidth = EXPORT_WIDTH - EXPORT_MARGIN * 2 - EXPORT_GAP
      const contentHeight = EXPORT_HEIGHT - EXPORT_MARGIN * 2 - EXPORT_FOOTER
      const itemWidth = contentWidth / 2
      const itemHeight = contentHeight
      const leftX = EXPORT_MARGIN
      const rightX = EXPORT_MARGIN + itemWidth + EXPORT_GAP
      const topY = EXPORT_MARGIN

      ctx.fillStyle = EXPORT_SURFACE
      ctx.fillRect(leftX, topY, itemWidth, itemHeight)
      ctx.fillRect(rightX, topY, itemWidth, itemHeight)

      if (inspoImage) {
        drawCoverImage(ctx, inspoImage, leftX, topY, itemWidth, itemHeight)
      } else {
        drawPlaceholder(ctx, leftX, topY, itemWidth, itemHeight, 'Inspo')
      }

      if (myImage) {
        drawCoverImage(ctx, myImage, rightX, topY, itemWidth, itemHeight)
      } else {
        drawPlaceholder(ctx, rightX, topY, itemWidth, itemHeight, 'My photo')
      }

      ctx.strokeStyle = EXPORT_LINE
      ctx.lineWidth = 1
      ctx.strokeRect(leftX + 0.5, topY + 0.5, itemWidth - 1, itemHeight - 1)
      ctx.strokeRect(rightX + 0.5, topY + 0.5, itemWidth - 1, itemHeight - 1)

      const captionTitle = titleDraft.trim()
      const dateLabel = new Date(look.created_at).toLocaleDateString()
      const caption = captionTitle ? `${captionTitle} - ${dateLabel}` : dateLabel

      if (caption) {
        ctx.fillStyle = EXPORT_TEXT
        ctx.font = '14px "Work Sans", sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(caption, EXPORT_WIDTH - EXPORT_MARGIN, EXPORT_HEIGHT - EXPORT_MARGIN / 2)
      }

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `look-${look.id}.png`
      link.click()
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'Export failed.'
      showToast(message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed'
          : ''

  if (loading) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          <div className="h-4 w-24 rounded-full bg-line/60" />
          <div className="h-7 w-2/3 rounded-full bg-line/50" />
          <div className="h-4 w-full rounded-full bg-line/40" />
          <div className="h-4 w-5/6 rounded-full bg-line/40" />
        </div>
      </Card>
    )
  }

  if (error || !look) {
    return (
      <Card className="p-8">
        <p className="type-eyebrow">Look</p>
        <h2 className="type-title text-2xl">Could not load look</h2>
        <p className="mt-2 type-body text-ink/70">{error ?? 'Try again.'}</p>
        <div className="mt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
      </Card>
    )
  }

  
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
          Back
        </Button>
        <div className="flex items-center gap-2" role="group" aria-label="Layout toggle">
          <Button
            type="button"
            size="sm"
            variant={layout === 'split' ? 'primary' : 'outline'}
            aria-pressed={layout === 'split'}
            onClick={() => setLayout('split')}
          >
            Split
          </Button>
          <Button
            type="button"
            size="sm"
            variant={layout === 'stack' ? 'primary' : 'outline'}
            aria-pressed={layout === 'stack'}
            onClick={() => setLayout('stack')}
          >
            Stack
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="look-title" className="sr-only">
          Title
        </label>
        <input
          id="look-title"
          className="w-full border-b border-line bg-transparent pb-2 font-serif text-3xl text-ink focus:border-accent/60 focus:outline-none"
          placeholder="Untitled"
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-muted">
          <span>{new Date(look.created_at).toLocaleDateString()}</span>
          <span>{saveLabel}</span>
        </div>
      </div>

<div className={layout === 'split' ? 'overflow-x-auto snap-x snap-mandatory' : ''}>

  <div
    className={
      layout === 'split'
        ? 'grid min-w-[720px] grid-cols-2 gap-4 md:min-w-0'
        : 'grid grid-cols-1 gap-6'
    }
  >
    {/* Inspo */}
<Card className="snap-start overflow-hidden p-0">
     <div className="flex items-center justify-between gap-4 p-4">
  <p className="type-eyebrow">Inspo</p>

  <div className="flex items-center gap-2">
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => inspoInputRef.current?.click()}
    >
      {images.inspoUrl ? 'Replace' : 'Add'}
    </Button>

    <input
      ref={inspoInputRef}
      type="file"
      accept={getAcceptedTypes()}
      className="hidden"
      onChange={(e) => void handlePickImage('inspo', e.target.files?.[0] ?? null)}
    />
  </div>
</div>

    </Card>

    {/* My photo */}
<Card className="snap-start overflow-hidden p-0">
     <div className="flex items-center justify-between gap-4 p-4">
  <p className="type-eyebrow">My photo</p>

  <div className="flex items-center gap-2">
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => myInputRef.current?.click()}
    >
      {images.myUrl ? 'Replace' : 'Add'}
    </Button>

    <input
      ref={myInputRef}
      type="file"
      accept={getAcceptedTypes()}
      className="hidden"
      onChange={(e) => void handlePickImage('me', e.target.files?.[0] ?? null)}
    />
  </div>
</div>

    </Card>
  </div>
</div>


      <Card className="p-6">
        <label htmlFor="look-notes" className="ui-label">
          Notes
        </label>
        <textarea
          id="look-notes"
          className="ui-input mt-3 min-h-[140px] resize-none"
          placeholder="Notes on texture, light, mood."
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" className="text-accent" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete look">
        <div className="space-y-4">
          <p className="type-body text-ink/70">
            This removes the look and its images. No undo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant === 'error' ? 'error' : 'info'}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
