export type StatusKind = 'loading' | 'empty' | 'info' | 'error'

export interface StatusMessageProps {
  kind: StatusKind
  message: string
  onRetry?: () => void
  retryLabel?: string
}
