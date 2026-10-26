import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { LOCALES, useI18n } from '../common/localization/I18nContext'
import type { Locale } from '../common/localization/I18nContext'
import { PATHS } from '../navigation/paths'
import styles from './AppLayout.module.css'

/** Kerala nilavilakku (brass oil lamp), drawn inline so it needs no image request. */
function LampIcon() {
  return (
    <svg className={styles.lamp} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 3c3 5 4 8 0 12-4-4-3-7 0-12z" fill="#f6b23c" />
      <path d="M13 17h22l-3 5H16z" fill="currentColor" />
      <rect x="22" y="22" width="4" height="15" fill="currentColor" />
      <path d="M15 37h18l3 6H12z" fill="currentColor" />
    </svg>
  )
}

/** Each language is named in itself, so devotees can find theirs whatever is showing. */
const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', ml: 'മലയാളം' }

function LanguageSwitcher() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div className={styles.languages} role="group" aria-label={t('language.label')}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={styles.language}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
        >
          {LANGUAGE_NAMES[option]}
        </button>
      ))}
    </div>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n()

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        {t('common.skipToContent')}
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <LampIcon />
          <div className={styles.brand}>
            <p className={styles.subtitle}>{t('app.subtitle')}</p>
            <p className={styles.title}>{t('app.title')}</p>
          </div>
          <nav className={styles.nav} aria-label={t('nav.label')}>
            <NavLink to={PATHS.booking} end className={styles.navLink}>
              {t('nav.book')}
            </NavLink>
            <NavLink to={PATHS.myBookings} className={styles.navLink}>
              {t('nav.myBookings')}
            </NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>{t('common.istNote')}</p>
      </footer>
    </div>
  )
}
