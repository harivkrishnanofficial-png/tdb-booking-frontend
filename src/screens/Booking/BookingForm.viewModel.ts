import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { queryKeys } from '../../app/QueryClient'
import {
  MAX_DEVOTEE_AGE,
  MAX_TICKETS_PER_BOOKING,
  MIN_DEVOTEE_AGE,
} from '../../common/constants/AppConstants'
import type { BookingRequest } from '../../models/Booking.model'
import { getApiErrorCode } from '../../services/api/ApiError'
import { darshanApi } from '../../services/api/MockApi'
import { createBookingFormSchema, getAgeCategory } from '../../utils/Validators'
import type { BookingFormValues } from '../../utils/Validators'
import type { BookingFormProps, BookingFormViewModel } from './Booking.types'

interface IdempotencyEntry {
  requestJson: string
  key: string
}

const DEFAULT_VALUES: Partial<BookingFormValues> = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  idNumber: '',
  tickets: 1,
  consent: false,
}

/** Sends an explicit allow-list of fields, so nothing extra from the form reaches the API. */
function toBookingRequest(slotId: string, values: BookingFormValues): BookingRequest {
  const { tickets, firstName, lastName, age, sex, phone, email, idType, idNumber } = values
  return {
    slotId,
    tickets,
    devotee: { firstName, lastName, age, sex, phone, email, idType, idNumber },
  }
}

function isValidAge(age: unknown): age is number {
  return Number.isInteger(age) && Number(age) >= MIN_DEVOTEE_AGE && Number(age) <= MAX_DEVOTEE_AGE
}

/**
 * Booking form behaviour: validation against the selected slot, the live age
 * category, and a submit that is safe against double taps and retries.
 */
export function useBookingFormViewModel({
  slot,
  onBooked,
}: Pick<BookingFormProps, 'slot' | 'onBooked'>): BookingFormViewModel {
  const queryClient = useQueryClient()
  const schema = useMemo(() => createBookingFormSchema(slot.remaining), [slot.remaining])

  const { register, handleSubmit, control, formState } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  })
  const [age, idType] = useWatch({ control, name: ['age', 'idType'] })

  // Set synchronously on the first tap. `isPending` only updates after a
  // re-render, so on its own it cannot stop a fast double tap.
  const inFlightRef = useRef(false)
  const idempotencyRef = useRef<IdempotencyEntry | null>(null)

  /**
   * Reuses the key while the devotee retries the same details, so a retry
   * after a lost response cannot book twice. Edited details are a new
   * booking and get a new key.
   */
  function getIdempotencyKey(request: BookingRequest): string {
    const requestJson = JSON.stringify(request)
    if (idempotencyRef.current?.requestJson !== requestJson) {
      idempotencyRef.current = { requestJson, key: crypto.randomUUID() }
    }
    return idempotencyRef.current.key
  }

  const mutation = useMutation({
    mutationFn: (request: BookingRequest) => darshanApi.createBooking(request, getIdempotencyKey(request)),
    onSuccess: (booking) => {
      idempotencyRef.current = null
      onBooked(booking)
    },
    // Refresh availability even after a failure: the server may have committed
    // the booking before the response was lost.
    onSettled: () => {
      inFlightRef.current = false
      return queryClient.invalidateQueries({ queryKey: queryKeys.slotsRoot })
    },
  })

  // On failure the form is left untouched, so the devotee keeps what they typed.
  const onSubmit = handleSubmit((values) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    mutation.mutate(toBookingRequest(slot.id, values))
  })

  return {
    register,
    errors: formState.errors,
    onSubmit,
    isSubmitting: mutation.isPending || formState.isSubmitting,
    submitErrorCode: mutation.isError ? getApiErrorCode(mutation.error) : null,
    maxTickets: Math.min(MAX_TICKETS_PER_BOOKING, slot.remaining),
    ageCategory: isValidAge(age) ? getAgeCategory(age) : null,
    idType,
  }
}
