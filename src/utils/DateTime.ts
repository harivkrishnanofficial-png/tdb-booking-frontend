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
