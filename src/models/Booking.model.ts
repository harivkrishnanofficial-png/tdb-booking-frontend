import type { LocalizedText } from './Temple.model'

export const SEXES = ['male', 'female', 'other'] as const
export type Sex = (typeof SEXES)[number]

export const ID_TYPES = ['aadhaar', 'voter', 'driving', 'passport', 'pan'] as const
export type IdType = (typeof ID_TYPES)[number]

/** Drives the queue lane at the gate: senior citizens get the priority lane. */
export type AgeCategory = 'child' | 'adult' | 'senior'

export type BookingStatus = 'confirmed' | 'cancelled'

/** The lead devotee for a booking. These are raw form values and are never stored as-is. */
export interface Devotee {
  firstName: string
  lastName: string
  age: number
  sex: Sex
  phone: string
  email: string
  idType: IdType
  idNumber: string
}

export interface BookingRequest {
  slotId: string
  tickets: number
  devotee: Devotee
}

/**
 * A booking as the API returns it. Personal data is already masked, so the UI
 * never holds the full phone or ID number after the booking is created.
 */
export interface Booking {
  id: string
  reference: string
  slotId: string
  templeName: LocalizedText
  date: string
  startsAt: string
  tickets: number
  status: BookingStatus
  devoteeName: string
  ageCategory: AgeCategory
  phoneMasked: string
  idType: IdType
  idMasked: string
  createdAt: string
  /** Signed payload encoded in the entry QR code. */
  qrPayload: string
}
