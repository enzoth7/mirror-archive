import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card', className)} {...props} />
}
