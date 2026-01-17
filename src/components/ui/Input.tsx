import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  helper?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, helper, className, id, ...props }, ref) => {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const input = <input id={inputId} ref={ref} className={cn('ui-input', className)} {...props} />

  if (!label) {
    return input
  }

  return (
    <label htmlFor={inputId} className="grid gap-2">
      <span className="ui-label">{label}</span>
      {input}
      {helper ? <span className="type-caption">{helper}</span> : null}
    </label>
  )
})

Input.displayName = 'Input'

export default Input
