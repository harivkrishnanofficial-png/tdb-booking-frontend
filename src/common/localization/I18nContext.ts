import { createContext, useContext } from 'react'
import type { LocalizedText } from '../../models/Temple.model'
import type { ApiErrorCode } from '../../services/api/ApiError'
import { EN } from './En'
import type { MessageKey } from './En'

export const LOCALES = ['en', 'ml'] as const
export type Locale = (typeof LOCALES)[number]

export type MessageValues = Record<string, string | number>

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Translates a key and fills `{name}` placeholders. */
  t: (key: MessageKey, values?: MessageValues) => string
  /** Picks the current language from text the API returns in both languages. */
  localize: (text: LocalizedText) => string
  /** Formats an IST day key (YYYY-MM-DD) in the current language. */
  formatDate: (dateKey: string, options?: Intl.DateTimeFormatOptions) => string
  /** Formats an instant as an IST time in the current language. */
  formatTime: (iso: string) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function isMessageKey(value: string): value is MessageKey {
  return value in EN
}

/** Message key for an API error. Fails to compile if a code has no message. */
export function apiErrorKey(code: ApiErrorCode): MessageKey {
  return `errors.${code}` as const
}

export function translate(
  messages: Record<MessageKey, string>,
  key: MessageKey,
  values: MessageValues = {},
): string {
  return messages[key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  )
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider.')
  return context
}
