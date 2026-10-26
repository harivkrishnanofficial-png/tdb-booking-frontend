import { useI18n } from '../../common/localization/I18nContext'
import { addDays } from '../../utils/DateTime'
import styles from './Calendar.module.css'
import type { CalendarProps } from './Calendar.types'
import { useCalendarViewModel } from './Calendar.viewModel'

/** Any Sunday: the column headers are this week's day names in the current language. */
const REFERENCE_SUNDAY = '2023-01-01'
const WEEK = Array.from({ length: 7 }, (_, index) => addDays(REFERENCE_SUNDAY, index))

/**
 * Inline month calendar. A custom grid rather than <input type="date">, because
 * the native picker follows the device language instead of the chosen one.
 */
export function CalendarView(props: CalendarProps) {
  const { t, formatDate } = useI18n()
  const viewModel = useCalendarViewModel(props)
  const monthLabelId = `${props.labelledBy}-month`

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          onClick={viewModel.goToPreviousMonth}
          disabled={!viewModel.canGoToPreviousMonth}
          aria-label={t('calendar.previousMonth')}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <p id={monthLabelId} className={styles.month} aria-live="polite">
          {formatDate(viewModel.monthStart, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          className={styles.navButton}
          onClick={viewModel.goToNextMonth}
          disabled={!viewModel.canGoToNextMonth}
          aria-label={t('calendar.nextMonth')}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <table
        ref={viewModel.gridRef}
        role="grid"
        className={styles.grid}
        aria-labelledby={`${props.labelledBy} ${monthLabelId}`}
        onKeyDown={viewModel.handleKeyDown}
      >
        <thead>
          <tr>
            {WEEK.map((day) => (
              <th key={day} scope="col" abbr={formatDate(day, { weekday: 'long' })}>
                {formatDate(day, { weekday: 'narrow' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viewModel.weeks.map((week) => (
            <tr key={week.find(Boolean)?.dateKey}>
              {week.map((day, index) =>
                day ? (
                  <td key={day.dateKey} role="gridcell" aria-selected={day.isSelected}>
                    <button
                      type="button"
                      className={styles.day}
                      data-date={day.dateKey}
                      tabIndex={day.isFocusTarget ? 0 : -1}
                      disabled={day.isDisabled}
                      aria-current={day.isToday ? 'date' : undefined}
                      aria-label={formatDate(day.dateKey, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      onClick={() => viewModel.selectDay(day.dateKey)}
                    >
                      {formatDate(day.dateKey, { day: 'numeric' })}
                    </button>
                  </td>
                ) : (
                  // Padding cells keep their column position, so the index is a stable key.
                  <td key={`empty-${index}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
