import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { queryKeys } from '../../app/QueryClient'
import { BOOKING_WINDOW_DAYS } from '../../common/constants/AppConstants'
import type { Booking } from '../../models/Booking.model'
import type { Slot } from '../../models/Temple.model'
import { darshanApi } from '../../services/api/MockApi'
import { getBookingWindow, hasStarted, toIstDateKey } from '../../utils/DateTime'
import type { BookingViewModel, SlotOption, SlotsState, TemplesState } from './Booking.types'

function toSlotOption(slot: Slot, now: Date): SlotOption {
  if (hasStarted(slot.startsAt, now)) return { slot, unavailableReason: 'started' }
  if (slot.remaining === 0) return { slot, unavailableReason: 'full' }
  return { slot, unavailableReason: null }
}

/**
 * State and behaviour for the booking screen: the temple and day the devotee
 * picked, the slots for that choice, the selected slot and the last booking.
 */
export function useBookingViewModel(): BookingViewModel {
  const today = toIstDateKey(new Date())
  const dates = useMemo(() => getBookingWindow(today, BOOKING_WINDOW_DAYS), [today])

  const [templeId, setTempleId] = useState('')
  const [date, setDate] = useState(today)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)

  const templesQuery = useQuery({
    queryKey: queryKeys.temples,
    queryFn: ({ signal }) => darshanApi.getTemples(signal),
    staleTime: Infinity,
  })

  // Each temple and day is its own cache entry, so the slots shown always
  // belong to the current selection. TanStack Query aborts superseded requests.
  const slotsQuery = useQuery({
    queryKey: queryKeys.slots(templeId, date),
    queryFn: ({ signal }) => darshanApi.getSlots(templeId, date, signal),
    enabled: templeId !== '',
  })

  const templesState: TemplesState = templesQuery.data
    ? { status: 'success', temples: templesQuery.data }
    : { status: templesQuery.isError ? 'error' : 'loading' }

  const slotOptions = slotsQuery.data?.map((slot) => toSlotOption(slot, new Date()))
  const slotsState = getSlotsState(templeId, slotsQuery.isError, slotOptions)

  // A slot that filled up or started after it was picked can no longer be booked.
  const selectedSlot =
    slotOptions?.find(({ slot, unavailableReason }) => slot.id === selectedSlotId && !unavailableReason)
      ?.slot ?? null
  const selectedTemple = templesQuery.data?.find(({ id }) => id === templeId) ?? null

  function resetSelection() {
    setSelectedSlotId(null)
    setConfirmedBooking(null)
  }

  return {
    templesState,
    slotsState,
    templeId,
    date,
    dates,
    selectedSlotId,
    selectedSlot,
    selectedTemple,
    confirmedBooking,
    selectTemple: (nextTempleId) => {
      setTempleId(nextTempleId)
      resetSelection()
    },
    selectDate: (nextDate) => {
      setDate(nextDate)
      resetSelection()
    },
    selectSlot: (slotId) => {
      setSelectedSlotId(slotId)
      setConfirmedBooking(null)
    },
    retryTemples: () => void templesQuery.refetch(),
    retrySlots: () => void slotsQuery.refetch(),
    handleBooked: setConfirmedBooking,
    startNewBooking: resetSelection,
  }
}

function getSlotsState(templeId: string, isError: boolean, options?: SlotOption[]): SlotsState {
  if (templeId === '') return { status: 'idle' }
  if (options) return { status: 'success', options }
  return { status: isError ? 'error' : 'loading' }
}
