import { createElement } from 'react'
import { __ } from '@wordpress/i18n'
import { toast } from 'sonner'
import ToastCard from '@components/common/ToastCard'

// Short fallback description per type so every toast has a supporting line.
// Caller-provided `description` always wins. Evaluated lazily so locale is ready.
const DEFAULT_DESC = {
  success: () => __('Your changes were saved successfully.', 'wedevs-project-manager'),
  error: () => __('Something went wrong. Please try again.', 'wedevs-project-manager'),
  warning: () => __('Please review the highlighted issue.', 'wedevs-project-manager'),
  info: () => __('Here is something you should know.', 'wedevs-project-manager'),
  loading: () => __('Please wait a moment…', 'wedevs-project-manager'),
}

// Route EVERY Sonner toast through our ToastCard so the full-body countdown
// fill + design are consistent app-wide. Patches the shared `toast` singleton,
// so any `import { toast } from 'sonner'` (Free or Pro) gets it automatically.
// Functionality is preserved: options (description, action, cancel, icon, id,
// duration, onAutoClose, …) pass straight through to Sonner.

const DURATION = { success: 3000, error: 5000, warning: 4000, info: 3000, message: 4000, loading: Infinity }

function patchType(type) {
  return (message, data = {}) => {
    const duration = data.duration ?? DURATION[type] ?? 4000
    const description = data.description ?? DEFAULT_DESC[type]?.()
    return toast.custom(
      (id) =>
        createElement(ToastCard, {
          type,
          title: message,
          description,
          icon: data.icon,
          user: data.user,
          action: data.action,
          cancel: data.cancel,
          duration,
          closeButton: data.closeButton !== false,
          onDismiss: () => toast.dismiss(id),
        }),
      { ...data, duration }
    )
  }
}

export function installCustomToasts() {
  if (toast.__pmPatched) return
  ;['success', 'error', 'warning', 'info', 'message', 'loading'].forEach((t) => {
    if (typeof toast[t] === 'function') toast[t] = patchType(t)
  })
  toast.__pmPatched = true
}

installCustomToasts()
