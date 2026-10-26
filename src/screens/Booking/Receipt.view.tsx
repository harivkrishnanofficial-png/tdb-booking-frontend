import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef } from 'react'
import { useI18n } from '../../common/localization/I18nContext'
import type { ReceiptProps } from './Booking.types'
import styles from './Receipt.module.css'

const QR_SIZE_PX = 176

/**
 * The darshan ticket. Gate officers scan the QR and compare the masked mobile
 * and ID with the devotee's card, so the receipt never shows full numbers.
 */
export function ReceiptView({ booking, onBookAnother }: ReceiptProps) {
  const { t, localize, formatDate, formatTime } = useI18n()
  const idTypeLabel = t(`idType.${booking.idType}`)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The form that had focus is gone after booking. Moving focus to the ticket
  // heading keeps keyboard users in place and makes screen readers read it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const rows = [
    { label: t('receipt.temple'), value: localize(booking.templeName) },
    { label: t('receipt.date'), value: formatDate(booking.date, { dateStyle: 'full' }) },
    { label: t('receipt.time'), value: formatTime(booking.startsAt) },
    { label: t('receipt.tickets'), value: String(booking.tickets) },
    { label: t('receipt.devotee'), value: booking.devoteeName },
    { label: t('receipt.category'), value: t(`category.${booking.ageCategory}`) },
    { label: t('receipt.phone'), value: booking.phoneMasked },
    { label: t('receipt.id'), value: `${idTypeLabel} · ${booking.idMasked}` },
  ]

  return (
    <article className={styles.receipt} aria-labelledby="receipt-heading" data-print-area>
      <header className={styles.header}>
        <h2 id="receipt-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          {t('receipt.heading')}
        </h2>
        <p className={styles.reference}>
          {t('receipt.reference')}: <strong>{booking.reference}</strong>
        </p>
      </header>

      <div className={styles.body}>
        <QRCodeSVG
          className={styles.qr}
          value={booking.qrPayload}
          size={QR_SIZE_PX}
          level="M"
          marginSize={2}
          role="img"
          aria-label={t('receipt.qrLabel', { reference: booking.reference })}
        />
        <dl className={styles.details}>
          {rows.map(({ label, value }) => (
            <div key={label} className={styles.row}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className={styles.instructions}>{t('receipt.instructions', { idType: idTypeLabel })}</p>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => window.print()}>
          {t('receipt.print')}
        </button>
        <button type="button" className={styles.secondary} onClick={onBookAnother}>
          {t('receipt.bookAnother')}
        </button>
      </div>
    </article>
  )
}
