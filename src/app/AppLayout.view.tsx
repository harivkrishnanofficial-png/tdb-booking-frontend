import type { ReactNode } from 'react'
import { useI18n } from '../common/localization/I18nContext'
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

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <LampIcon />
          <div>
            <p className={styles.subtitle}>{t('app.subtitle')}</p>
            <p className={styles.title}>{t('app.title')}</p>
          </div>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
