import styles from './StatusMessage.module.css'
import type { StatusMessageProps } from './StatusMessage.types'

/**
 * Loading, empty and error feedback with the right live-region role, so
 * screen readers announce it: errors interrupt, everything else is polite.
 */
export function StatusMessage({ kind, message, onRetry, retryLabel }: StatusMessageProps) {
  const isError = kind === 'error'

  return (
    <div className={`${styles.status} ${styles[kind]}`} role={isError ? 'alert' : 'status'}>
      {kind === 'loading' && <span className={styles.spinner} aria-hidden="true" />}
      <p className={styles.message}>{message}</p>
      {onRetry && retryLabel && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}
