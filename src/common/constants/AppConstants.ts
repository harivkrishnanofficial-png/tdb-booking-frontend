/** Temple timings are fixed in IST, so every date and time is computed and shown in IST. */
export const IST_TIME_ZONE = 'Asia/Kolkata'

/** IST has no daylight saving, so a fixed offset is safe for building timestamps. */
export const IST_UTC_OFFSET = '+05:30'

/** Devotees can book from today up to this many days ahead, including today (assumption: 30). */
export const BOOKING_WINDOW_DAYS = 30

/** Per-booking cap so one devotee cannot block a whole slot (assumption, see PR #1). */
export const MAX_TICKETS_PER_BOOKING = 10

export const MIN_DEVOTEE_AGE = 1
export const MAX_DEVOTEE_AGE = 120

/** Age at which a devotee is treated as a child (below) or a senior citizen (at or above). */
export const ADULT_MIN_AGE = 12
export const SENIOR_CITIZEN_MIN_AGE = 60

export const NAME_MAX_LENGTH = 50
