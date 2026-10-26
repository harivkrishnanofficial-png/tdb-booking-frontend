import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { formatDate, formatTime } from '../../utils/DateTime'
import { EN } from './En'
import { I18nContext, translate } from './I18nContext'
import type { I18nContextValue, Locale } from './I18nContext'

const INTL_LOCALES: Record<Locale, string> = { en: 'en-IN' }

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale: Locale = 'en'

  const value = useMemo<I18nContextValue>(() => {
    const intlLocale = INTL_LOCALES[locale]
    return {
      locale,
      t: (key, values) => translate(EN, key, values),
      localize: (text) => text[locale],
      formatDate: (dateKey, options) => formatDate(dateKey, intlLocale, options),
      formatTime: (iso) => formatTime(iso, intlLocale),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
