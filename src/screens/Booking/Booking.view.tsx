import { StatusMessage } from '../../components/StatusMessage/StatusMessage.view'
import { useI18n } from '../../common/localization/I18nContext'
import type { MessageKey } from '../../common/localization/En'
import styles from './Booking.module.css'
import type { BookingViewModel, SlotOption, SlotUnavailableReason } from './Booking.types'
import { useBookingViewModel } from './Booking.viewModel'
import { BookingFormView } from './BookingForm.view'
import { ReceiptView } from './Receipt.view'

const UNAVAILABLE_LABELS: Record<Exclude<SlotUnavailableReason, null>, MessageKey> = {
  full: 'slots.full',
  started: 'slots.started',
}

function TempleSelect({ viewModel }: { viewModel: BookingViewModel }) {
  const { t, localize } = useI18n()
  const { templesState, templeId, selectTemple, retryTemples } = viewModel

  if (templesState.status === 'loading') {
    return <StatusMessage kind="loading" message={t('temples.loading')} />
  }
  if (templesState.status === 'error') {
    return (
      <StatusMessage
        kind="error"
        message={t('temples.error')}
        onRetry={retryTemples}
        retryLabel={t('common.retry')}
      />
    )
  }

  return (
    <div className={styles.field}>
      <label htmlFor="temple">{t('filters.temple')}</label>
      <select
        id="temple"
        className={styles.select}
        value={templeId}
        onChange={(event) => selectTemple(event.target.value)}
      >
        <option value="">{t('filters.templePlaceholder')}</option>
        {templesState.temples.map((temple) => (
          <option key={temple.id} value={temple.id}>
            {localize(temple.name)}, {localize(temple.location)}
          </option>
        ))}
      </select>
    </div>
  )
}

function DatePicker({ viewModel }: { viewModel: BookingViewModel }) {
  const { t, formatDate } = useI18n()
  const { dates, date, selectDate } = viewModel

  return (
    <fieldset className={styles.fieldset}>
      <legend>{t('filters.date')}</legend>
      <div className={styles.chips}>
        {dates.map((day) => (
          <label key={day} className={styles.chip}>
            <input
              type="radio"
              name="date"
              value={day}
              checked={day === date}
              onChange={() => selectDate(day)}
            />
            <span>{formatDate(day)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function SlotCard({ option, isSelected, onSelect }: {
  option: SlotOption
  isSelected: boolean
  onSelect: (slotId: string) => void
}) {
  const { t, formatTime } = useI18n()
  const { slot, unavailableReason } = option
  const availability = unavailableReason
    ? t(UNAVAILABLE_LABELS[unavailableReason])
    : t('slots.left', { count: slot.remaining, capacity: slot.capacity })

  return (
    <li>
      <label className={styles.slot} data-unavailable={unavailableReason ?? undefined}>
        <input
          type="radio"
          name="slot"
          value={slot.id}
          checked={isSelected}
          disabled={unavailableReason !== null}
          onChange={() => onSelect(slot.id)}
        />
        <span className={styles.slotTime}>{formatTime(slot.startsAt)}</span>
        <span className={styles.slotAvailability}>{availability}</span>
      </label>
    </li>
  )
}

function SlotList({ viewModel }: { viewModel: BookingViewModel }) {
  const { t, formatDate } = useI18n()
  const { slotsState, date, selectedSlotId, selectSlot, retrySlots } = viewModel

  switch (slotsState.status) {
    case 'idle':
      return <StatusMessage kind="info" message={t('slots.chooseTemple')} />
    case 'loading':
      return <StatusMessage kind="loading" message={t('slots.loading')} />
    case 'error':
      return (
        <StatusMessage
          kind="error"
          message={t('slots.error')}
          onRetry={retrySlots}
          retryLabel={t('common.retry')}
        />
      )
    case 'success':
      if (slotsState.options.length === 0) {
        return <StatusMessage kind="empty" message={t('slots.empty')} />
      }
      return (
        <fieldset className={styles.fieldset}>
          <legend className={styles.visuallyHidden}>
            {t('slots.heading')}, {formatDate(date)}
          </legend>
          <ul className={styles.slotList}>
            {slotsState.options.map((option) => (
              <SlotCard
                key={option.slot.id}
                option={option}
                isSelected={option.slot.id === selectedSlotId}
                onSelect={selectSlot}
              />
            ))}
          </ul>
        </fieldset>
      )
  }
}

function BookingPanel({ viewModel }: { viewModel: BookingViewModel }) {
  const { t } = useI18n()
  const { confirmedBooking, selectedSlot, selectedTemple, handleBooked, startNewBooking } = viewModel

  if (confirmedBooking) {
    return <ReceiptView booking={confirmedBooking} onBookAnother={startNewBooking} />
  }
  if (!selectedSlot || !selectedTemple) {
    return <StatusMessage kind="info" message={t('form.selectSlotHint')} />
  }
  return (
    // Keyed by slot so switching slots starts a fresh form and mutation.
    <BookingFormView
      key={selectedSlot.id}
      slot={selectedSlot}
      temple={selectedTemple}
      onBooked={handleBooked}
    />
  )
}

export function BookingView() {
  const { t, formatDate } = useI18n()
  const viewModel = useBookingViewModel()

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="booking-heading">
        <h1 id="booking-heading" className={styles.heading}>
          {t('booking.heading')}
        </h1>
        <p className={styles.intro}>{t('booking.intro')}</p>
        <TempleSelect viewModel={viewModel} />
        <DatePicker viewModel={viewModel} />

        <h2 className={styles.subheading}>
          {t('slots.heading')}
          <span className={styles.subheadingDate}>
            {formatDate(viewModel.date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </h2>
        <SlotList viewModel={viewModel} />
      </section>

      <section className={styles.panel} aria-label={t('form.heading')}>
        <BookingPanel viewModel={viewModel} />
      </section>
    </div>
  )
}
