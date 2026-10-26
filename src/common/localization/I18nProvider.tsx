import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { formatDate, formatTime } from '../../utils/DateTime'
import { EN } from './En'
import { I18nContext, LOCALES, translate } from './I18nContext'
import type { I18nContextValue, Locale } from './I18nContext'
import { ML } from './Ml'

const LOCALE_STORAGE_KEY = 'tdb.locale'

const MESSAGES = { en: EN, ml: ML }

/** Indian variants, so dates and times follow Indian conventions in both languages. */
const INTL_LOCALES: Record<Locale, string> = { en: 'en-IN', ml: 'ml-IN' }

function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value)
}

// Storage can throw (private mode, blocked site data). The language is only a
// preference, so failures fall back to English without breaking the app.
function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Not remembered this time; the switch itself still works.
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)

  // Screen readers pick their pronunciation from the document language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const intlLocale = INTL_LOCALES[locale]
    return {
      locale,
      setLocale: (nextLocale) => {
        storeLocale(nextLocale)
        setLocale(nextLocale)
      },
      t: (key, values) => translate(MESSAGES[locale], key, values),
      localize: (text) => text[locale],
      formatDate: (dateKey, options) => formatDate(dateKey, intlLocale, options),
      formatTime: (iso) => formatTime(iso, intlLocale),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
