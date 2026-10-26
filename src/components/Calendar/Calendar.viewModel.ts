import { useEffect, useRef, useState } from 'react'
import { addDays, getMonthStart, getMonthWeeks, getWeekday, shiftMonths } from '../../utils/DateTime'
import type { CalendarProps, CalendarViewModel } from './Calendar.types'

const DAYS_PER_WEEK = 7
const LAST_WEEKDAY = 6

/**
 * Keyboard moves for the date grid (WAI-ARIA APG date picker pattern):
 * arrows by day and week, Home/End to the start/end of the week, Page Up/Down
 * by month. Enter and Space select via the native button.
 */
function getKeyTarget(key: string, dateKey: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(dateKey, -1)
    case 'ArrowRight':
      return addDays(dateKey, 1)
    case 'ArrowUp':
      return addDays(dateKey, -DAYS_PER_WEEK)
    case 'ArrowDown':
      return addDays(dateKey, DAYS_PER_WEEK)
    case 'Home':
      return addDays(dateKey, -getWeekday(dateKey))
    case 'End':
      return addDays(dateKey, LAST_WEEKDAY - getWeekday(dateKey))
    case 'PageUp':
      return shiftMonths(dateKey, -1)
    case 'PageDown':
      return shiftMonths(dateKey, 1)
    default:
      return null
  }
}

/** Month navigation, keyboard focus and selection for an inline calendar. */
export function useCalendarViewModel({ value, min, max, today, onChange }: CalendarProps): CalendarViewModel {
  const [focusedDate, setFocusedDate] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  const gridRef = useRef<HTMLTableElement>(null)
  // Only keyboard moves pull DOM focus; month buttons keep focus where it is.
  const shouldFocusDayRef = useRef(false)

  // Follow outside changes to the value (Back button, shared link) during render.
  if (value !== previousValue) {
    setPreviousValue(value)
    setFocusedDate(value)
  }

  useEffect(() => {
    if (!shouldFocusDayRef.current) return
    shouldFocusDayRef.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus()
  }, [focusedDate])

  // ISO day keys sort as strings, so plain comparison clamps correctly.
  const clamp = (dateKey: string) => (dateKey < min ? min : dateKey > max ? max : dateKey)
  const monthStart = getMonthStart(focusedDate)

  const weeks = getMonthWeeks(monthStart).map((week) =>
    week.map((dateKey) =>
      dateKey
        ? {
            dateKey,
            isSelected: dateKey === value,
            isFocusTarget: dateKey === focusedDate,
            isToday: dateKey === today,
            isDisabled: dateKey < min || dateKey > max,
          }
        : null,
    ),
  )

  return {
    monthStart,
    weeks,
    canGoToPreviousMonth: monthStart > getMonthStart(min),
    canGoToNextMonth: monthStart < getMonthStart(max),
    gridRef,
    goToPreviousMonth: () => setFocusedDate(clamp(shiftMonths(focusedDate, -1))),
    goToNextMonth: () => setFocusedDate(clamp(shiftMonths(focusedDate, 1))),
    selectDay: (dateKey) => {
      setFocusedDate(dateKey)
      onChange(dateKey)
    },
    handleKeyDown: (event) => {
      const target = getKeyTarget(event.key, focusedDate)
      if (!target) return
      event.preventDefault()
      shouldFocusDayRef.current = true
      setFocusedDate(clamp(target))
    },
  }
}
