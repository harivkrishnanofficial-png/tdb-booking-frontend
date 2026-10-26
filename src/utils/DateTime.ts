import { IST_TIME_ZONE, IST_UTC_OFFSET } from '../common/constants/AppConstants'

const DAY_MS = 24 * 60 * 60 * 1000

// en-CA formats dates as YYYY-MM-DD, which is the key format the API uses.
const istDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Returns the IST calendar day (YYYY-MM-DD) for an instant, whatever the device time zone. */
export function toIstDateKey(instant: Date): string {
  return istDateKeyFormatter.format(instant)
}

/** Builds a UTC ISO timestamp from an IST day and a 24-hour HH:mm time. */
export function istToIso(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00${IST_UTC_OFFSET}`).toISOString()
}

/** Adds whole days to an IST day key. */
export function addDays(dateKey: string, days: number): string {
  const noonIst = new Date(istToIso(dateKey, '12:00')).getTime()
  return toIstDateKey(new Date(noonIst + days * DAY_MS))
}

/** The bookable days, starting with today in IST. */
export function getBookingWindow(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(today, index))
}

export function hasStarted(startsAt: string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() <= now.getTime()
}

/** Formats an IST day key, for example "Sat, 31 Oct". */
export function formatDate(
  dateKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: IST_TIME_ZONE }).format(
    new Date(istToIso(dateKey, '12:00')),
  )
}

/** Formats an instant as an IST clock time, for example "6:30 am". */
export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/*
 * Calendar arithmetic on YYYY-MM-DD keys. Done in UTC on purpose: these are
 * calendar days, not instants, so the device time zone must not shift them.
 */
const DAYS_PER_WEEK = 7

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseKey(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split('-').map(Number)
  return [year, month, day]
}

/** Day of the week for a day key: 0 = Sunday … 6 = Saturday. */
export function getWeekday(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay()
}

/** First day (YYYY-MM-01) of the month containing a day key. */
export function getMonthStart(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`
}

/** Moves a day key by whole months, keeping the day where possible (31 Jan + 1 → 28/29 Feb). */
export function shiftMonths(dateKey: string, months: number): string {
  const [year, month, day] = parseKey(dateKey)
  const daysInTarget = new Date(Date.UTC(year, month + months, 0)).getUTCDate()
  return toKey(new Date(Date.UTC(year, month - 1 + months, Math.min(day, daysInTarget))))
}

/** Sunday-first weeks for a month. Cells outside the month are null. */
export function getMonthWeeks(monthStart: string): (string | null)[][] {
  const [year, month] = parseKey(monthStart)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (string | null)[] = Array.from({ length: getWeekday(monthStart) }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toKey(new Date(Date.UTC(year, month - 1, day))))
  }
  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null)

  return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, week) =>
    cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  )
}
