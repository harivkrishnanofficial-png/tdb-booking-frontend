import { MAX_TICKETS_PER_BOOKING } from '../../common/constants/AppConstants'
import type { Booking, BookingRequest } from '../../models/Booking.model'
import type { Slot, Temple } from '../../models/Temple.model'
import { hasStarted } from '../../utils/DateTime'
import { PHONE_PATTERN, devoteeSchema, getAgeCategory, normalizeIdNumber } from '../../utils/Validators'
import {
  decrypt,
  encrypt,
  hashForLookup,
  maskIdNumber,
  maskPhone,
  sign,
} from '../security/Privacy'
import { ApiError } from './ApiError'
import { db, seedMockDb } from './MockDb'
import type { StoredBooking } from './MockDb'

/**
 * How a failed call fails. A request can be lost before the server sees it,
 * or the server can process it and the response is lost on the way back.
 */
type FailureMode = 'random' | 'lost-request' | 'lost-response'

interface MockApiConfig {
  failureRate: number
  failureMode: FailureMode
  minLatencyMs: number
  maxLatencyMs: number
}

const DEFAULT_CONFIG: MockApiConfig = {
  failureRate: 0.2,
  failureMode: 'random',
  minLatencyMs: 200,
  maxLatencyMs: 1500,
}

let config: MockApiConfig = { ...DEFAULT_CONFIG }

/** Changes network behaviour, for example `{ failureRate: 0 }` in tests. */
export function configureMockApi(overrides: Partial<MockApiConfig>): void {
  config = { ...config, ...overrides }
}

/** Restores the default network behaviour and re-seeds the data. */
export function resetMockApi(now?: Date): void {
  config = { ...DEFAULT_CONFIG }
  seedMockDb(now)
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

function pickFailure(): Exclude<FailureMode, 'random'> | null {
  if (Math.random() >= config.failureRate) return null
  if (config.failureMode !== 'random') return config.failureMode
  return Math.random() < 0.5 ? 'lost-request' : 'lost-response'
}

/**
 * Runs a server handler behind a simulated unreliable network: random latency,
 * then a configurable chance of failing before or after the handler commits.
 * Results are deep-copied so the UI can never mutate the "database".
 */
async function simulateNetwork<T>(handler: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const latency = config.minLatencyMs + Math.random() * (config.maxLatencyMs - config.minLatencyMs)
  await wait(latency, signal)

  const failure = pickFailure()
  if (failure === 'lost-request') {
    throw new ApiError('NETWORK', 'The request did not reach the server.')
  }
  const result = await handler()
  if (failure === 'lost-response') {
    throw new ApiError('NETWORK', 'The server responded, but the response was lost.')
  }
  return structuredClone(result)
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const REFERENCE_LENGTH = 8

/** Short, unambiguous reference (no 0/O or 1/I) that devotees can read out at the counter. */
function createReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFERENCE_LENGTH))
  const code = Array.from(bytes, (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length])
  return `TDB-${code.join('')}`
}

function findSlot(slotId: string): Slot {
  const slot = db.slots.get(slotId)
  if (!slot) throw new ApiError('SLOT_NOT_FOUND')
  return slot
}

/** Maps a stored record to the API shape: masked fields only, plus the decrypted name. */
async function toBooking(stored: StoredBooking): Promise<Booking> {
  const slot = findSlot(stored.slotId)
  const temple = db.temples.find(({ id }) => id === slot.templeId)
  if (!temple) throw new ApiError('SLOT_NOT_FOUND')

  return {
    id: stored.id,
    reference: stored.reference,
    slotId: stored.slotId,
    templeName: temple.name,
    date: slot.date,
    startsAt: slot.startsAt,
    tickets: stored.tickets,
    status: stored.status,
    devoteeName: await decrypt(stored.name),
    ageCategory: stored.ageCategory,
    phoneMasked: stored.phoneMasked,
    idType: stored.idType,
    idMasked: stored.idMasked,
    createdAt: stored.createdAt,
    qrPayload: stored.qrPayload,
  }
}

/**
 * The QR holds only what a gate officer needs to admit the group: no full phone
 * or ID numbers. The HMAC signature makes edited or forged tickets detectable.
 */
async function createQrPayload(stored: Omit<StoredBooking, 'qrPayload'>, slot: Slot): Promise<string> {
  const data = JSON.stringify({
    v: 1,
    ref: stored.reference,
    temple: slot.templeId,
    startsAt: slot.startsAt,
    tickets: stored.tickets,
    category: stored.ageCategory,
    idType: stored.idType,
    id: stored.idMasked,
    phone: stored.phoneMasked,
  })
  return JSON.stringify({ data, sig: await sign(data) })
}

function validateRequest(request: BookingRequest) {
  const { tickets } = request
  const devotee = devoteeSchema.safeParse(request.devotee)
  const hasValidTickets = Number.isInteger(tickets) && tickets >= 1 && tickets <= MAX_TICKETS_PER_BOOKING
  if (!devotee.success || !hasValidTickets) throw new ApiError('INVALID_REQUEST')
  return devotee.data
}

/**
 * Returns the booking already created for this key, or null if the key is new.
 * A key reused with a different request body is a client bug, so it is rejected.
 */
function findReplay(idempotencyKey: string, requestHash: string): StoredBooking | null {
  const record = db.idempotencyKeys.get(idempotencyKey)
  if (!record) return null
  if (record.requestHash !== requestHash) throw new ApiError('IDEMPOTENCY_KEY_REUSED')
  return db.bookings.get(record.bookingId) ?? null
}

async function commitBooking(request: BookingRequest, idempotencyKey: string): Promise<Booking> {
  if (!idempotencyKey) throw new ApiError('INVALID_REQUEST')
  const requestHash = await hashForLookup(JSON.stringify(request))
  const replay = findReplay(idempotencyKey, requestHash)
  if (replay) return toBooking(replay)

  const slot = findSlot(request.slotId)
  const devotee = validateRequest(request)
  const idNumber = normalizeIdNumber(devotee.idNumber)

  // Do every async step (encryption, hashing, signing) before checking capacity.
  // The check-and-decrement below is then synchronous, so two concurrent
  // bookings cannot both pass the check and oversell the slot.
  const draft: Omit<StoredBooking, 'qrPayload'> = {
    id: crypto.randomUUID(),
    reference: createReference(),
    slotId: slot.id,
    tickets: request.tickets,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    sex: devotee.sex,
    ageCategory: getAgeCategory(devotee.age),
    idType: devotee.idType,
    name: await encrypt(`${devotee.firstName} ${devotee.lastName}`),
    phone: await encrypt(devotee.phone),
    email: devotee.email ? await encrypt(devotee.email) : null,
    idNumber: await encrypt(idNumber),
    phoneHash: await hashForLookup(devotee.phone),
    idHash: await hashForLookup(idNumber),
    phoneMasked: maskPhone(devotee.phone),
    idMasked: maskIdNumber(idNumber),
  }
  const stored: StoredBooking = { ...draft, qrPayload: await createQrPayload(draft, slot) }

  // A duplicate of this request may have committed while this one was encrypting.
  const concurrentReplay = findReplay(idempotencyKey, requestHash)
  if (concurrentReplay) return toBooking(concurrentReplay)

  if (hasStarted(slot.startsAt)) throw new ApiError('SLOT_STARTED')
  if (slot.remaining < request.tickets) throw new ApiError('NOT_ENOUGH_TICKETS')
  slot.remaining -= request.tickets
  db.bookings.set(stored.id, stored)
  db.idempotencyKeys.set(idempotencyKey, { requestHash, bookingId: stored.id })

  return toBooking(stored)
}

/** Lists the temples devotees can book darshan at. */
function getTemples(signal?: AbortSignal): Promise<Temple[]> {
  return simulateNetwork(async () => db.temples, signal)
}

/** Slots for a temple on an IST day (YYYY-MM-DD), in start-time order. */
function getSlots(templeId: string, date: string, signal?: AbortSignal): Promise<Slot[]> {
  return simulateNetwork(async () => {
    const slots = [...db.slots.values()].filter(
      (slot) => slot.templeId === templeId && slot.date === date,
    )
    return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, signal)
}

/**
 * Books tickets in a slot. Safe to retry: the server stores each
 * `idempotencyKey` with its booking, and a repeated key returns the original
 * booking instead of creating a second one, even if the first response was lost.
 * @throws ApiError SLOT_STARTED, NOT_ENOUGH_TICKETS, INVALID_REQUEST,
 *   IDEMPOTENCY_KEY_REUSED or NETWORK.
 */
function createBooking(request: BookingRequest, idempotencyKey: string): Promise<Booking> {
  return simulateNetwork(() => commitBooking(request, idempotencyKey))
}

/** A devotee's bookings, found by phone number, in start-time order. */
function getBookings(phone: string, signal?: AbortSignal): Promise<Booking[]> {
  return simulateNetwork(async () => {
    if (!PHONE_PATTERN.test(phone)) throw new ApiError('INVALID_REQUEST')
    const phoneHash = await hashForLookup(phone)
    const matches = [...db.bookings.values()].filter((booking) => booking.phoneHash === phoneHash)
    const bookings = await Promise.all(matches.map(toBooking))
    return bookings.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, signal)
}

/**
 * Cancels a booking and releases its tickets back to the slot.
 * @throws ApiError SLOT_STARTED once darshan has begun, or BOOKING_ALREADY_CANCELLED.
 */
function cancelBooking(bookingId: string): Promise<Booking> {
  return simulateNetwork(async () => {
    const stored = db.bookings.get(bookingId)
    if (!stored) throw new ApiError('BOOKING_NOT_FOUND')
    if (stored.status === 'cancelled') throw new ApiError('BOOKING_ALREADY_CANCELLED')

    const slot = findSlot(stored.slotId)
    if (hasStarted(slot.startsAt)) throw new ApiError('SLOT_STARTED')

    stored.status = 'cancelled'
    slot.remaining += stored.tickets
    return toBooking(stored)
  })
}

/** The app's only data source. An object, so tests can spy on single calls. */
export const darshanApi = {
  getTemples,
  getSlots,
  createBooking,
  getBookings,
  cancelBooking,
}
