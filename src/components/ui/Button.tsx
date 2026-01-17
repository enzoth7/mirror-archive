import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'ui-button--primary',
  ghost: 'ui-button--ghost',
  outline: 'ui-button--outline'
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-[0.65rem]',
  md: 'px-5 py-2.5',
  lg: 'px-6 py-3 text-[0.75rem]'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={cn('ui-button', variants[variant], sizes[size], className)} {...props} />
}
