import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Dropzone from '../components/ui/Dropzone'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import { useAuth } from '../lib/auth'
import {
  createLookWithImages,
  getAcceptedTypes,
  MAX_FILE_BYTES,
  validateImageFile
} from '../lib/lookService'

export default function NewLook() {
  const { user } = useAuth()
  const maxMb = Math.round(MAX_FILE_BYTES / (1024 * 1024))
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null)
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: 'info' | 'error' }>({
    open: false,
    message: '',
    variant: 'info'
  })
  const [inspoFile, setInspoFile] = useState<File | null>(null)
  const [myFile, setMyFile] = useState<File | null>(null)
  const [inspoPreview, setInspoPreview] = useState<string | null>(null)
  const [myPreview, setMyPreview] = useState<string | null>(null)

  const showToast = (message: string, variant: 'info' | 'error' = 'error') => {
    setToast({ open: true, message, variant })
  }


  
  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((current) => ({ ...current, open: false })), 2800)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  useEffect(() => {
    if (!inspoFile) {
      setInspoPreview(null)
      return
    }
    const url = URL.createObjectURL(inspoFile)
    setInspoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [inspoFile])

  useEffect(() => {
    if (!myFile) {
      setMyPreview(null)
      return
    }
    const url = URL.createObjectURL(myFile)
    setMyPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [myFile])

  const onSelectFile = (file: File | null, kind: 'inspo' | 'me') => {
    if (!file) {
      if (kind === 'inspo') setInspoFile(null)
      if (kind === 'me') setMyFile(null)
      return
    }
    const validationError = validateImageFile(file)
    if (validationError) {
      showToast(validationError, 'error')
      return
    }
    if (kind === 'inspo') setInspoFile(file)
    if (kind === 'me') setMyFile(file)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setProgress({ percent: 0, label: 'Starting' })

    const { lookId, error } = await createLookWithImages({
      userId: user.id,
      title,
      notes,
      inspoFile,
      myFile,
      onProgress: setProgress
    })

    if (error) {
      showToast(error, 'error')
      setSaving(false)
      setProgress(null)
      return
    }

    setSaving(false)
    if (lookId) {
      navigate(`/look/${lookId}`)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-8">
        <div className="space-y-3">
          <p className="type-eyebrow">New look</p>
          <h2 className="type-title text-3xl">Make a quiet look</h2>
        </div>
        <form className="mt-8 grid gap-6" onSubmit={onSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <Dropzone
              label="Inspo"
hint={`JPG, PNG, or WEBP. Max ${maxMb}MB.`}
              file={inspoFile}
              accept={getAcceptedTypes()}
              disabled={saving}
              onFileChange={(file) => onSelectFile(file, 'inspo')}
            />
            <Dropzone
              label="My photo"
hint={`JPG, PNG, or WEBP. Max ${maxMb}MB.`}
              file={myFile}
              accept={getAcceptedTypes()}
              disabled={saving}
              onFileChange={(file) => onSelectFile(file, 'me')}
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-4">
              <div className="space-y-3">
                <p className="type-eyebrow">Inspo</p>
                <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-card border border-line bg-canvas">
                  {inspoPreview ? (
                    <img src={inspoPreview} alt="Inspo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="type-caption">No image yet</span>
                  )}
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-3">
                <p className="type-eyebrow">My photo</p>
                <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-card border border-line bg-canvas">
                  {myPreview ? (
                    <img src={myPreview} alt="My photo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="type-caption">No image yet</span>
                  )}
                </div>
              </div>
            </Card>
          </div>
          <Input
            label="Title"
            placeholder="Late afternoon"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="grid gap-2">
            <span className="ui-label">Notes</span>
            <textarea
              className="ui-input min-h-[140px] resize-none"
              placeholder="Texture, light, mood."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {progress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted">
                <span>{progress.label}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-line/70">
                <div
                  className="h-2 rounded-full bg-accent/70 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
              Preview
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save look'}
            </Button>
          </div>
        </form>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Preview">
        <div className="space-y-4">
          <p className="type-body text-ink/70">
            Just a draft. Save when it feels right.
          </p>
          <div className="rounded-card border border-line bg-canvas p-4">
            <p className="type-eyebrow">Draft</p>
            <h4 className="mt-2 type-subtitle">{title || 'Late afternoon'}</h4>
            <p className="mt-2 type-body text-ink/70">{notes || 'Soft linen, warm light.'}</p>
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
