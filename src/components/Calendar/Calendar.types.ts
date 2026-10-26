import type { KeyboardEvent, RefObject } from 'react'

export interface CalendarProps {
  /** Selected day (YYYY-MM-DD). */
  value: string
  /** First and last selectable days; everything outside is disabled. */
  min: string
  max: string
  today: string
  /** Id of the element that names the calendar, for example "Day of darshan". */
  labelledBy: string
  onChange: (dateKey: string) => void
}

export interface CalendarDay {
  dateKey: string
  isSelected: boolean
  /** The one day in the tab order (roving tabindex). */
  isFocusTarget: boolean
  isToday: boolean
  isDisabled: boolean
}

export interface CalendarViewModel {
  monthStart: string
  weeks: (CalendarDay | null)[][]
  canGoToPreviousMonth: boolean
  canGoToNextMonth: boolean
  gridRef: RefObject<HTMLTableElement | null>
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  selectDay: (dateKey: string) => void
  handleKeyDown: (event: KeyboardEvent<HTMLTableElement>) => void
}
