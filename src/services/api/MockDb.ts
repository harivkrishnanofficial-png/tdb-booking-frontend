import { BOOKING_WINDOW_DAYS } from '../../common/constants/AppConstants'
import type { AgeCategory, BookingStatus, IdType, Sex } from '../../models/Booking.model'
import type { Slot, Temple } from '../../models/Temple.model'
import { getBookingWindow, istToIso, toIstDateKey } from '../../utils/DateTime'
import type { EncryptedValue } from '../security/Privacy'

/**
 * A booking as the server stores it. Personal fields are encrypted at rest;
 * phone and ID are also kept as keyed hashes (for lookup) and masked copies
 * (for display), so reading a booking never needs the clear values.
 */
export interface StoredBooking {
  id: string
  reference: string
  slotId: string
  tickets: number
  status: BookingStatus
  createdAt: string
  sex: Sex
  ageCategory: AgeCategory
  idType: IdType
  name: EncryptedValue
  phone: EncryptedValue
  email: EncryptedValue | null
  idNumber: EncryptedValue
  phoneHash: string
  idHash: string
  phoneMasked: string
  idMasked: string
  qrPayload: string
}

/** What the server remembers about an idempotency key it has already processed. */
export interface IdempotencyRecord {
  /** Keyed hash of the request body, so a reused key with a different body is rejected. */
  requestHash: string
  bookingId: string
}

interface MockDb {
  temples: Temple[]
  slots: Map<string, Slot>
  bookings: Map<string, StoredBooking>
  idempotencyKeys: Map<string, IdempotencyRecord>
}

const TEMPLES: Temple[] = [
  {
    id: 'sabarimala',
    name: { en: 'Sabarimala Sree Dharma Sastha Temple', ml: 'ശബരിമല ശ്രീ ധർമ്മശാസ്താ ക്ഷേത്രം' },
    location: { en: 'Pathanamthitta', ml: 'പത്തനംതിട്ട' },
  },
  {
    id: 'ettumanoor',
    name: { en: 'Ettumanoor Mahadeva Temple', ml: 'ഏറ്റുമാനൂർ മഹാദേവ ക്ഷേത്രം' },
    location: { en: 'Kottayam', ml: 'കോട്ടയം' },
  },
  {
    id: 'aranmula',
    name: { en: 'Aranmula Parthasarathy Temple', ml: 'ആറന്മുള പാർത്ഥസാരഥി ക്ഷേത്രം' },
    location: { en: 'Pathanamthitta', ml: 'പത്തനംതിട്ട' },
  },
  {
    id: 'vaikom',
    name: { en: 'Vaikom Mahadeva Temple', ml: 'വൈക്കം മഹാദേവ ക്ഷേത്രം' },
    location: { en: 'Kottayam', ml: 'കോട്ടയം' },
  },
]

/** Daily darshan timings (IST) and how many devotees each slot admits. */
const SLOT_PLAN = [
  { time: '05:00', capacity: 120 },
  { time: '07:30', capacity: 100 },
  { time: '10:00', capacity: 80 },
  { time: '16:30', capacity: 100 },
  { time: '18:30', capacity: 120 },
] as const

const FULL_SLOT_EVERY = 5

/** Deterministic pseudo-random availability, so roughly one slot in five is full. */
function seededRemaining(capacity: number, seed: number): number {
  if (seed % FULL_SLOT_EVERY === 0) return 0
  return 1 + ((seed * 37) % capacity)
}

function createSlots(now: Date): Map<string, Slot> {
  const slots = new Map<string, Slot>()
  const days = getBookingWindow(toIstDateKey(now), BOOKING_WINDOW_DAYS)

  TEMPLES.forEach((temple, templeIndex) => {
    days.forEach((date, dayIndex) => {
      SLOT_PLAN.forEach(({ time, capacity }, slotIndex) => {
        const id = `${temple.id}-${date}-${time.replace(':', '')}`
        const seed = templeIndex * 31 + dayIndex * 7 + slotIndex
        slots.set(id, {
          id,
          templeId: temple.id,
          date,
          startsAt: istToIso(date, time),
          capacity,
          remaining: seededRemaining(capacity, seed),
        })
      })
    })
  })

  return slots
}

/** The in-memory "database". Tests may adjust slots directly to set up a scenario. */
export const db: MockDb = {
  temples: TEMPLES,
  slots: createSlots(new Date()),
  bookings: new Map(),
  idempotencyKeys: new Map(),
}

/** Re-seeds every table. Today's early slots have already started, relative to `now`. */
export function seedMockDb(now: Date = new Date()): void {
  db.slots = createSlots(now)
  db.bookings = new Map()
  db.idempotencyKeys = new Map()
}
