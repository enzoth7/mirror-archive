import { useId, useState, type DragEvent } from 'react'
import Button from './Button'
import { cn } from '../../lib/cn'

type DropzoneProps = {
  label: string
  hint?: string
  file: File | null
  accept: string
  disabled?: boolean
  onFileChange: (file: File | null) => void
}

export default function Dropzone({ label, hint, file, accept, disabled, onFileChange }: DropzoneProps) {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled) return
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) {
      onFileChange(dropped)
    }
    setIsDragging(false)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled) return
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  return (
    <div className="space-y-2">
      <p className="ui-label">{label}</p>
      <div
        className={cn(
          'ui-card flex min-h-[140px] items-center justify-center border-dashed bg-surface/60',
          isDragging ? 'border-accent/60 bg-accent/10' : 'border-line'
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept}
          disabled={disabled}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <span className="text-xs uppercase tracking-[0.3em] text-muted">Drop here</span>
          <span className="text-sm text-ink/70">or pick a file</span>
          {hint ? <span className="text-xs text-muted">{hint}</span> : null}
        </label>
      </div>
      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>{file.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)} disabled={disabled}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  )
}
