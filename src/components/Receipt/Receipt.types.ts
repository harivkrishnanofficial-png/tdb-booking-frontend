import type { Booking } from '../../models/Booking.model'

export interface ReceiptProps {
  booking: Booking
  /** Moves focus to the ticket heading on mount (after booking, the form that had focus is gone). */
  autoFocus?: boolean
  /** Shown as "Book another darshan" when provided. */
  onBookAnother?: () => void
}
