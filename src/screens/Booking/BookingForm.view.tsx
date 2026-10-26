import { MAX_DEVOTEE_AGE, MIN_DEVOTEE_AGE } from '../../common/constants/AppConstants'
import type { MessageKey } from '../../common/localization/En'
import { apiErrorKey, isMessageKey, useI18n } from '../../common/localization/I18nContext'
import { ID_TYPES, SEXES } from '../../models/Booking.model'
import type { AgeCategory } from '../../models/Booking.model'
import type { BookingFormValues } from '../../utils/Validators'
import styles from './BookingForm.module.css'
import type { BookingFormProps } from './Booking.types'
import { useBookingFormViewModel } from './BookingForm.viewModel'

type FieldName = keyof BookingFormValues

const CATEGORY_NOTES: Record<AgeCategory, MessageKey> = {
  child: 'category.childNote',
  adult: 'category.adultNote',
  senior: 'category.seniorNote',
}

export function BookingFormView({ slot, temple, onBooked }: BookingFormProps) {
  const { t, localize, formatDate, formatTime } = useI18n()
  const { register, errors, onSubmit, isSubmitting, submitErrorCode, maxTickets, ageCategory, idType } =
    useBookingFormViewModel({ slot, onBooked })

  function errorText(name: FieldName): string | undefined {
    const message = errors[name]?.message
    if (!message) return undefined
    return isMessageKey(message) ? t(message) : message
  }

  /** Links a control to its hint and error text, so screen readers read both. */
  function describedBy(name: FieldName, hintId?: string) {
    const ids = [hintId, errors[name] ? `${name}-error` : undefined].filter(Boolean)
    return {
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined,
    }
  }

  function renderError(name: FieldName) {
    const message = errorText(name)
    return message ? (
      <p id={`${name}-error`} className={styles.error}>
        {message}
      </p>
    ) : null
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2 className={styles.heading}>{t('form.heading')}</h2>
      <p className={styles.summary}>
        {localize(temple.name)} · {formatDate(slot.date)} · {formatTime(slot.startsAt)}
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="firstName">{t('form.firstName')}</label>
          <input id="firstName" autoComplete="given-name" {...register('firstName')} {...describedBy('firstName')} />
          {renderError('firstName')}
        </div>
        <div className={styles.field}>
          <label htmlFor="lastName">{t('form.lastName')}</label>
          <input id="lastName" autoComplete="family-name" {...register('lastName')} {...describedBy('lastName')} />
          {renderError('lastName')}
        </div>

        <div className={styles.field}>
          <label htmlFor="age">{t('form.age')}</label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={MIN_DEVOTEE_AGE}
            max={MAX_DEVOTEE_AGE}
            {...register('age', { valueAsNumber: true })}
            {...describedBy('age', 'age-category')}
          />
          {renderError('age')}
          {ageCategory && (
            <p id="age-category" className={styles.category} data-category={ageCategory}>
              {t('category.label', { category: t(`category.${ageCategory}`) })}.{' '}
              {t(CATEGORY_NOTES[ageCategory])}
            </p>
          )}
        </div>
        <fieldset className={styles.radioGroup} {...describedBy('sex')}>
          <legend>{t('form.sex')}</legend>
          <div className={styles.radios}>
            {SEXES.map((sex) => (
              <label key={sex} className={styles.radio}>
                <input type="radio" value={sex} {...register('sex')} />
                {t(`sex.${sex}`)}
              </label>
            ))}
          </div>
          {renderError('sex')}
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="phone">{t('form.phone')}</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            {...register('phone')}
            {...describedBy('phone', 'phone-hint')}
          />
          <p id="phone-hint" className={styles.hint}>
            {t('form.phoneHint')}
          </p>
          {renderError('phone')}
        </div>
        <div className={styles.field}>
          <label htmlFor="email">{t('form.email')}</label>
          <input id="email" type="email" autoComplete="email" {...register('email')} {...describedBy('email')} />
          {renderError('email')}
        </div>

        <div className={styles.field}>
          <label htmlFor="idType">{t('form.idType')}</label>
          <select id="idType" {...register('idType')} {...describedBy('idType')}>
            <option value="">{t('form.idTypePlaceholder')}</option>
            {ID_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`idType.${type}`)}
              </option>
            ))}
          </select>
          {renderError('idType')}
        </div>
        <div className={styles.field}>
          <label htmlFor="idNumber">{t('form.idNumber')}</label>
          <input
            id="idNumber"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            {...register('idNumber')}
            {...describedBy('idNumber', idType ? 'id-hint' : undefined)}
          />
          {idType && (
            <p id="id-hint" className={styles.hint}>
              {t(`idHint.${idType}`)}
            </p>
          )}
          {renderError('idNumber')}
        </div>

        <div className={styles.field}>
          <label htmlFor="tickets">{t('form.tickets')}</label>
          <select
            id="tickets"
            {...register('tickets', { valueAsNumber: true })}
            {...describedBy('tickets', 'tickets-hint')}
          >
            {Array.from({ length: maxTickets }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <p id="tickets-hint" className={styles.hint}>
            {t('form.ticketsHint', { max: maxTickets })}
          </p>
          {renderError('tickets')}
        </div>
      </div>

      <p className={styles.privacy}>{t('form.privacyNote')}</p>
      <div className={styles.field}>
        <label className={styles.consent}>
          <input type="checkbox" {...register('consent')} {...describedBy('consent')} />
          <span>{t('form.consent')}</span>
        </label>
        {renderError('consent')}
      </div>

      {submitErrorCode && (
        <p className={styles.submitError} role="alert">
          {t('form.error', { reason: t(apiErrorKey(submitErrorCode)) })}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? t('form.submitting') : t('form.submit')}
      </button>
    </form>
  )
}
