import { z } from 'zod'
import {
  ADULT_MIN_AGE,
  MAX_DEVOTEE_AGE,
  MAX_TICKETS_PER_BOOKING,
  MIN_DEVOTEE_AGE,
  NAME_MAX_LENGTH,
  SENIOR_CITIZEN_MIN_AGE,
} from '../common/constants/AppConstants'
import { ID_TYPES, SEXES } from '../models/Booking.model'
import type { AgeCategory, IdType } from '../models/Booking.model'

/** Indian mobile numbers: 10 digits starting with 6–9. */
export const PHONE_PATTERN = /^[6-9]\d{9}$/

// Letters in any script (so Malayalam names work), plus space, dot, apostrophe and hyphen.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u

/** Formats published by the issuing authorities, checked after normalizeIdNumber(). */
const ID_PATTERNS: Record<IdType, RegExp> = {
  aadhaar: /^[2-9]\d{11}$/,
  voter: /^[A-Z]{3}\d{7}$/,
  driving: /^[A-Z]{2}\d{13}$/,
  passport: /^[A-Z]\d{7}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
}

/** Removes the spaces and hyphens people type for readability, and uppercases letters. */
export function normalizeIdNumber(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase()
}

export function isValidIdNumber(idType: IdType, value: string): boolean {
  return ID_PATTERNS[idType].test(normalizeIdNumber(value))
}

/** Maps the lead devotee's age to the queue category printed on the ticket. */
export function getAgeCategory(age: number): AgeCategory {
  if (age < ADULT_MIN_AGE) return 'child'
  if (age >= SENIOR_CITIZEN_MIN_AGE) return 'senior'
  return 'adult'
}

/*
 * Error messages are i18n keys, so the same schema serves both languages.
 * The schema is shared by the form and the mock server, which validates again,
 * because client-side checks can always be bypassed.
 */
const nameField = z
  .string()
  .trim()
  .min(1, 'validation.required')
  .max(NAME_MAX_LENGTH, 'validation.nameTooLong')
  .regex(NAME_PATTERN, 'validation.nameInvalid')

export const devoteeSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    age: z
      .number({ error: 'validation.ageInvalid' })
      .int('validation.ageInvalid')
      .min(MIN_DEVOTEE_AGE, 'validation.ageInvalid')
      .max(MAX_DEVOTEE_AGE, 'validation.ageInvalid'),
    sex: z.enum(SEXES, { error: 'validation.required' }),
    phone: z.string().trim().regex(PHONE_PATTERN, 'validation.phoneInvalid'),
    email: z.union([z.literal(''), z.email('validation.emailInvalid')]),
    idType: z.enum(ID_TYPES, { error: 'validation.required' }),
    idNumber: z.string().trim().min(1, 'validation.required'),
  })
  .refine((devotee) => isValidIdNumber(devotee.idType, devotee.idNumber), {
    message: 'validation.idInvalid',
    path: ['idNumber'],
  })

/**
 * Booking form schema. The ticket limit depends on the slot, so the schema is
 * built per slot: the smaller of the per-booking cap and the tickets remaining.
 */
export function createBookingFormSchema(remaining: number) {
  const maxTickets = Math.min(MAX_TICKETS_PER_BOOKING, remaining)

  return devoteeSchema.and(
    z.object({
      tickets: z
        .number({ error: 'validation.ticketsInvalid' })
        .int('validation.ticketsInvalid')
        .min(1, 'validation.ticketsInvalid')
        .max(maxTickets, 'validation.ticketsTooMany'),
      consent: z.boolean().refine((accepted) => accepted, 'validation.consentRequired'),
    }),
  )
}

export type BookingFormValues = z.infer<ReturnType<typeof createBookingFormSchema>>

/** Finding bookings: the ID type is not asked again, so any valid ID format is accepted. */
export const bookingLookupSchema = z.object({
  phone: z.string().trim().regex(PHONE_PATTERN, 'validation.phoneInvalid'),
  idNumber: z
    .string()
    .trim()
    .refine((value) => ID_TYPES.some((idType) => isValidIdNumber(idType, value)), 'validation.idUnknown'),
})
