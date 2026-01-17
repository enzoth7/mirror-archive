import Button from './Button'
import { cn } from '../../lib/cn'

type ToastProps = {
  open: boolean
  message: string
  variant?: 'info' | 'success' | 'error'
  onClose: () => void
}

const variants: Record<NonNullable<ToastProps['variant']>, string> = {
  info: 'border-line bg-surface text-ink',
  success: 'border-accent/40 bg-accent/10 text-ink',
  error: 'border-accent/50 bg-accent/10 text-ink'
}

export default function Toast({ open, message, variant = 'info', onClose }: ToastProps) {
  if (!open) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm justify-end">
      <div
        className={cn(
          'pointer-events-auto flex items-center justify-between gap-4 rounded-card border px-5 py-4 shadow-lift',
          variants[variant]
        )}
        role="status"
        aria-live="polite"
      >
        <span className="text-sm">{message}</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Ok
        </Button>
      </div>
    </div>
  )
}
