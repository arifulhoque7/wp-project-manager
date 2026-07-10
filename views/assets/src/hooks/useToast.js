/**
 * Toast notifications using Sonner (recommended by shadcn/ui for React).
 * Replaces the shadcn-vue toast system.
 */
import { toast } from 'sonner'
import { createElement } from 'react'
import { CircleCheck, CircleX, AlertTriangle, Info } from 'lucide-react'

const icon = (Icon, color) => createElement(Icon, { style: { color }, className: 'h-5 w-5' })

// Expose each toast's duration to CSS so the countdown progress bar
// (see tailwind.css [data-sonner-toast]::after) matches its dismiss timer.
const dur = (ms) => ({ duration: ms, style: { '--pm-toast-duration': `${ms}ms` } })

export function useToast() {
  return {
    success: (message, description) =>
      toast.success(message, { description, ...dur(3000), icon: icon(CircleCheck, '#16a34a') }),
    error: (message, description) =>
      toast.error(message, { description, ...dur(5000), icon: icon(CircleX, '#dc2626') }),
    warning: (message, description) =>
      toast.warning(message, { description, ...dur(4000), icon: icon(AlertTriangle, '#d97706') }),
    info: (message, description) =>
      toast.info(message, { description, ...dur(3000), icon: icon(Info, '#2563eb') }),
  }
}
