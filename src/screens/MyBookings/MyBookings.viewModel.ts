import { zodResolver } from '@hookform/resolvers/zod'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { queryKeys } from '../../app/QueryClient'
import type { Booking, BookingLookup, BookingStatus } from '../../models/Booking.model'
import { getApiErrorCode } from '../../services/api/ApiError'
import { darshanApi } from '../../services/api/MockApi'
import { hasStarted } from '../../utils/DateTime'
import { bookingLookupSchema } from '../../utils/Validators'
import type {
  BookingCard,
  BookingsState,
  CancelContext,
  CancelFailure,
  MyBookingsViewModel,
} from './MyBookings.types'

/**
 * Finds a devotee's bookings and cancels them optimistically: the card shows
 * "Cancelled" at once, and goes back to its previous status, with an error,
 * if the server refuses or the network fails.
 */
export function useMyBookingsViewModel(): MyBookingsViewModel {
  const queryClient = useQueryClient()
  const [lookup, setLookup] = useState<BookingLookup | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancelFailure, setCancelFailure] = useState<CancelFailure | null>(null)
  // One ticket open at a time keeps the list short on a phone.
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { register, handleSubmit, formState } = useForm<BookingLookup>({
    resolver: zodResolver(bookingLookupSchema),
    defaultValues: { phone: '', idNumber: '' },
  })

  const bookingsKey = queryKeys.bookings(lookup?.phone ?? '', lookup?.idNumber ?? '')
  const bookingsQuery = useQuery({
    queryKey: bookingsKey,
    queryFn: lookup ? ({ signal }) => darshanApi.getBookings(lookup, signal) : skipToken,
  })

  function setStatus(bookingId: string, status: BookingStatus) {
    queryClient.setQueryData<Booking[]>(bookingsKey, (bookings) =>
      bookings?.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    )
  }

  const cancelMutation = useMutation<Booking, Error, string, CancelContext>({
    mutationFn: (bookingId) => darshanApi.cancelBooking(bookingId),
    onMutate: async (bookingId) => {
      setConfirmingId(null)
      setCancelFailure(null)
      // Stop an in-flight refetch from overwriting the optimistic update.
      await queryClient.cancelQueries({ queryKey: bookingsKey })
      const previous = queryClient.getQueryData<Booking[]>(bookingsKey)
      const previousStatus = previous?.find(({ id }) => id === bookingId)?.status
      setStatus(bookingId, 'cancelled')
      return { previousStatus }
    },
    onError: (error, bookingId, context) => {
      // Roll back only this booking, so other bookings' changes are kept.
      if (context?.previousStatus) setStatus(bookingId, context.previousStatus)
      const reference = bookingsQuery.data?.find(({ id }) => id === bookingId)?.reference ?? ''
      setCancelFailure({ reference, code: getApiErrorCode(error) })
    },
    // The server is the source of truth: if a "failed" cancel actually went
    // through before the response was lost, the refetch shows it as cancelled.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingsKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.slotsRoot }),
      ]),
  })

  const now = new Date()
  const toCard = (booking: Booking): BookingCard => {
    const started = hasStarted(booking.startsAt, now)
    return {
      booking,
      hasStarted: started,
      canCancel: booking.status === 'confirmed' && !started && !cancelMutation.isPending,
      isConfirming: confirmingId === booking.id,
      isCancelling: cancelMutation.isPending && cancelMutation.variables === booking.id,
      isExpanded: expandedId === booking.id,
    }
  }

  return {
    register,
    errors: formState.errors,
    onLookup: handleSubmit((values) => {
      setCancelFailure(null)
      setExpandedId(null)
      setLookup(values)
    }),
    bookingsState: getBookingsState(lookup, bookingsQuery.isError, bookingsQuery.data?.map(toCard)),
    cancelFailure,
    retry: () => void bookingsQuery.refetch(),
    requestCancel: setConfirmingId,
    dismissCancel: () => setConfirmingId(null),
    confirmCancel: (bookingId) => cancelMutation.mutate(bookingId),
    toggleReceipt: (bookingId) => setExpandedId((current) => (current === bookingId ? null : bookingId)),
  }
}

function getBookingsState(
  lookup: BookingLookup | null,
  isError: boolean,
  cards?: BookingCard[],
): BookingsState {
  if (!lookup) return { status: 'idle' }
  if (cards) return { status: 'success', cards }
  return { status: isError ? 'error' : 'loading' }
}
