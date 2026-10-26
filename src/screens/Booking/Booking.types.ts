import type { BaseSyntheticEvent } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { AgeCategory, Booking, IdType } from '../../models/Booking.model'
import type { Slot, Temple } from '../../models/Temple.model'
import type { ApiErrorCode } from '../../services/api/ApiError'
import type { BookingFormValues } from '../../utils/Validators'

export type TemplesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; temples: Temple[] }

/** Why a slot cannot be booked, or null when it can. */
export type SlotUnavailableReason = 'full' | 'started' | null

export interface SlotOption {
  slot: Slot
  unavailableReason: SlotUnavailableReason
}

/** "idle" means no temple is chosen yet; an empty day is a success with no slots. */
export type SlotsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; options: SlotOption[] }

export interface BookingViewModel {
  templesState: TemplesState
  slotsState: SlotsState
  templeId: string
  date: string
  dates: string[]
  selectedSlotId: string | null
  selectedSlot: Slot | null
  selectedTemple: Temple | null
  confirmedBooking: Booking | null
  selectTemple: (templeId: string) => void
  selectDate: (date: string) => void
  selectSlot: (slotId: string) => void
  retryTemples: () => void
  retrySlots: () => void
  handleBooked: (booking: Booking) => void
  startNewBooking: () => void
}

export interface BookingFormProps {
  slot: Slot
  temple: Temple
  onBooked: (booking: Booking) => void
}

export interface BookingFormViewModel {
  register: UseFormRegister<BookingFormValues>
  errors: FieldErrors<BookingFormValues>
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  isSubmitting: boolean
  submitErrorCode: ApiErrorCode | null
  /** Changes on every submit, so the error alert can be re-announced. */
  submitAttempt: number
  maxTickets: number
  ageCategory: AgeCategory | null
  idType: IdType | undefined
}

export interface ReceiptProps {
  booking: Booking
  onBookAnother: () => void
}
