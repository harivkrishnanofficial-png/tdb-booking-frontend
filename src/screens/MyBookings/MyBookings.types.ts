import type { BaseSyntheticEvent } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { Booking, BookingLookup, BookingStatus } from '../../models/Booking.model'
import type { ApiErrorCode } from '../../services/api/ApiError'

export interface BookingCard {
  booking: Booking
  /** True once darshan has started: the server would refuse the cancellation. */
  hasStarted: boolean
  canCancel: boolean
  isConfirming: boolean
  isCancelling: boolean
  /** The ticket (receipt) is open below the card. */
  isExpanded: boolean
}

/** "idle" means the devotee has not searched yet. */
export type BookingsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; cards: BookingCard[] }

export interface CancelFailure {
  reference: string
  code: ApiErrorCode
}

/** Passed from onMutate to onError, so a failed cancel restores only its own booking. */
export interface CancelContext {
  previousStatus: BookingStatus | undefined
}

export interface MyBookingsViewModel {
  register: UseFormRegister<BookingLookup>
  errors: FieldErrors<BookingLookup>
  onLookup: (event?: BaseSyntheticEvent) => Promise<void>
  bookingsState: BookingsState
  cancelFailure: CancelFailure | null
  retry: () => void
  requestCancel: (bookingId: string) => void
  dismissCancel: () => void
  confirmCancel: (bookingId: string) => void
  toggleReceipt: (bookingId: string) => void
}
