import { StatusMessage } from '../../components/StatusMessage/StatusMessage.view'
import { apiErrorKey, isMessageKey, useI18n } from '../../common/localization/I18nContext'
import type { BookingLookup } from '../../models/Booking.model'
import styles from './MyBookings.module.css'
import type { BookingCard, MyBookingsViewModel } from './MyBookings.types'
import { useMyBookingsViewModel } from './MyBookings.viewModel'

function LookupForm({ viewModel }: { viewModel: MyBookingsViewModel }) {
  const { t } = useI18n()
  const { register, errors, onLookup } = viewModel

  function fieldProps(name: keyof BookingLookup, hintId?: string) {
    const ids = [hintId, errors[name] ? `lookup-${name}-error` : undefined].filter(Boolean)
    return {
      id: `lookup-${name}`,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined,
      ...register(name),
    }
  }

  function renderError(name: keyof BookingLookup) {
    const message = errors[name]?.message
    if (!message) return null
    return (
      <p id={`lookup-${name}-error`} className={styles.error}>
        {isMessageKey(message) ? t(message) : message}
      </p>
    )
  }

  return (
    <form className={styles.lookup} onSubmit={onLookup} noValidate>
      <div className={styles.field}>
        <label htmlFor="lookup-phone">{t('form.phone')}</label>
        <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} {...fieldProps('phone')} />
        {renderError('phone')}
      </div>
      <div className={styles.field}>
        <label htmlFor="lookup-idNumber">{t('form.idNumber')}</label>
        <input autoComplete="off" spellCheck={false} {...fieldProps('idNumber', 'lookup-id-hint')} />
        <p id="lookup-id-hint" className={styles.hint}>
          {t('myBookings.idHint')}
        </p>
        {renderError('idNumber')}
      </div>
      <button type="submit" className={styles.primary}>
        {t('myBookings.find')}
      </button>
    </form>
  )
}

function BookingCardView({ card, viewModel }: { card: BookingCard; viewModel: MyBookingsViewModel }) {
  const { t, localize, formatDate, formatTime } = useI18n()
  const { booking, hasStarted, canCancel, isConfirming, isCancelling } = card
  const headingId = `booking-${booking.id}`

  return (
    <li>
      <article className={styles.card} aria-labelledby={headingId} data-status={booking.status}>
        <header className={styles.cardHeader}>
          <h2 id={headingId} className={styles.temple}>
            {localize(booking.templeName)}
          </h2>
          <span className={styles.badge}>{t(`status.${booking.status}`)}</span>
        </header>
        <p className={styles.when}>
          {formatDate(booking.date, { dateStyle: 'full' })} · {formatTime(booking.startsAt)}
        </p>
        <p className={styles.meta}>
          {t('myBookings.tickets', { count: booking.tickets })} ·{' '}
          {t('myBookings.reference', { reference: booking.reference })}
        </p>

        {isCancelling && (
          <p className={styles.pending} role="status">
            {t('myBookings.cancelling')}
          </p>
        )}
        {hasStarted && booking.status === 'confirmed' && (
          <p className={styles.reason}>
            {t('myBookings.startedReason', { time: formatTime(booking.startsAt) })}
          </p>
        )}

        {canCancel && !isConfirming && (
          <button type="button" className={styles.secondary} onClick={() => viewModel.requestCancel(booking.id)}>
            {t('myBookings.cancel')}
          </button>
        )}
        {canCancel && isConfirming && (
          <div className={styles.confirm} role="group" aria-labelledby={`${headingId}-confirm`}>
            <p id={`${headingId}-confirm`}>{t('myBookings.confirmPrompt')}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.danger} onClick={() => viewModel.confirmCancel(booking.id)}>
                {t('myBookings.confirmYes')}
              </button>
              <button type="button" className={styles.secondary} onClick={viewModel.dismissCancel}>
                {t('myBookings.confirmNo')}
              </button>
            </div>
          </div>
        )}
      </article>
    </li>
  )
}

function BookingList({ viewModel }: { viewModel: MyBookingsViewModel }) {
  const { t } = useI18n()
  const { bookingsState, retry } = viewModel

  switch (bookingsState.status) {
    case 'idle':
      return null
    case 'loading':
      return <StatusMessage kind="loading" message={t('myBookings.loading')} />
    case 'error':
      return (
        <StatusMessage kind="error" message={t('myBookings.error')} onRetry={retry} retryLabel={t('common.retry')} />
      )
    case 'success':
      if (bookingsState.cards.length === 0) {
        return <StatusMessage kind="empty" message={t('myBookings.empty')} />
      }
      return (
        <ul className={styles.list}>
          {bookingsState.cards.map((card) => (
            <BookingCardView key={card.booking.id} card={card} viewModel={viewModel} />
          ))}
        </ul>
      )
  }
}

export function MyBookingsView() {
  const { t } = useI18n()
  const viewModel = useMyBookingsViewModel()
  const { cancelFailure } = viewModel

  return (
    <section className={styles.page} aria-labelledby="my-bookings-heading">
      <h1 id="my-bookings-heading" className={styles.heading}>
        {t('myBookings.heading')}
      </h1>
      <p className={styles.intro}>{t('myBookings.intro')}</p>
      <LookupForm viewModel={viewModel} />

      {cancelFailure && (
        <p className={styles.failure} role="alert">
          {t('myBookings.cancelFailed', {
            reference: cancelFailure.reference,
            reason: t(apiErrorKey(cancelFailure.code)),
          })}
        </p>
      )}
      <BookingList viewModel={viewModel} />
    </section>
  )
}
