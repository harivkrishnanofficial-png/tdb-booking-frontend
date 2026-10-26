import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { queryKeys } from '../../app/QueryClient'
import { BOOKING_WINDOW_DAYS } from '../../common/constants/AppConstants'
import type { Booking } from '../../models/Booking.model'
import type { Slot } from '../../models/Temple.model'
import { darshanApi } from '../../services/api/MockApi'
import { getBookingWindow, hasStarted, toIstDateKey } from '../../utils/DateTime'
import type {
  BookingViewModel,
  CopyResult,
  CopyStatus,
  SlotOption,
  SlotsState,
  TemplesState,
} from './Booking.types'

/** Query-string names, kept short so shared links stay readable on WhatsApp. */
const TEMPLE_PARAM = 'temple'
const DATE_PARAM = 'date'

interface Selection {
  /** The temple and day this selection was made for. */
  filterKey: string
  slotId: string | null
  booking: Booking | null
}

function toSlotOption(slot: Slot, now: Date): SlotOption {
  if (hasStarted(slot.startsAt, now)) return { slot, unavailableReason: 'started' }
  if (slot.remaining === 0) return { slot, unavailableReason: 'full' }
  return { slot, unavailableReason: null }
}

/**
 * State and behaviour for the booking screen.
 *
 * The temple and day live in the URL, so they survive a refresh, can be shared
 * as a link, and the browser Back button restores the previous choice. A
 * missing or out-of-range date (for example an old shared link) falls back to today.
 */
export function useBookingViewModel(): BookingViewModel {
  const today = toIstDateKey(new Date())
  const dates = useMemo(() => getBookingWindow(today, BOOKING_WINDOW_DAYS), [today])
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()

  const templesQuery = useQuery({
    queryKey: queryKeys.temples,
    queryFn: ({ signal }) => darshanApi.getTemples(signal),
    staleTime: Infinity,
  })

  const requestedTemple = searchParams.get(TEMPLE_PARAM) ?? ''
  const requestedDate = searchParams.get(DATE_PARAM) ?? ''
  const selectedTemple = templesQuery.data?.find(({ id }) => id === requestedTemple) ?? null
  // Fetch slots straight away from the link rather than waiting for the temple
  // list; drop the temple only once the list proves it does not exist.
  const isUnknownTemple = templesQuery.data !== undefined && !selectedTemple
  const templeId = isUnknownTemple ? '' : requestedTemple
  const date = dates.includes(requestedDate) ? requestedDate : today

  // Each temple and day is its own cache entry, so a slow response for a
  // selection the devotee has already left can never replace the current one.
  // TanStack Query also aborts the superseded request through `signal`.
  const slotsQuery = useQuery({
    queryKey: queryKeys.slots(templeId, date),
    queryFn: ({ signal }) => darshanApi.getSlots(templeId, date, signal),
    enabled: templeId !== '',
  })

  // The picked slot and booking belong to one temple and day. Tagging them with
  // that filter means navigating Back or Forward drops them without an effect.
  const filterKey = `${templeId}|${date}`
  const [selection, setSelection] = useState<Selection>({ filterKey, slotId: null, booking: null })
  const current = selection.filterKey === filterKey ? selection : { slotId: null, booking: null }

  const templesState: TemplesState = templesQuery.data
    ? { status: 'success', temples: templesQuery.data }
    : { status: templesQuery.isError ? 'error' : 'loading' }

  const slotOptions = slotsQuery.data?.map((slot) => toSlotOption(slot, new Date()))
  const slotsState = getSlotsState(templeId, slotsQuery.isError, slotOptions)

  // A slot that filled up or started after it was picked can no longer be booked.
  const selectedSlot =
    slotOptions?.find(({ slot, unavailableReason }) => slot.id === current.slotId && !unavailableReason)
      ?.slot ?? null

  // Always carries both temple and day, even if the current URL omits the day,
  // so the link opens the same view on any phone.
  const shareUrl = selectedTemple ? buildShareUrl(pathname, templeId, date) : null
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null)
  const copyStatus: CopyStatus = copyResult?.filterKey === filterKey ? copyResult.status : 'idle'

  /** Clipboard access can be refused (permissions, non-HTTPS), so failure is reported, not thrown. */
  async function copyShareLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyResult({ filterKey, status: 'copied' })
    } catch {
      setCopyResult({ filterKey, status: 'failed' })
    }
  }

  /**
   * Pushes a history entry, so Back returns to the previous temple and day.
   * Empty values remove the parameter, so shared links stay clean.
   */
  function updateFilters(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([name, value]) => {
      if (value) next.set(name, value)
      else next.delete(name)
    })
    setSearchParams(next)
  }

  return {
    templesState,
    slotsState,
    templeId,
    date,
    dates,
    selectedSlotId: current.slotId,
    selectedSlot,
    selectedTemple,
    confirmedBooking: current.booking,
    selectTemple: (nextTempleId) => updateFilters({ [TEMPLE_PARAM]: nextTempleId, [DATE_PARAM]: date }),
    selectDate: (nextDate) => updateFilters({ [DATE_PARAM]: nextDate }),
    selectSlot: (slotId) => setSelection({ filterKey, slotId, booking: null }),
    retryTemples: () => void templesQuery.refetch(),
    retrySlots: () => void slotsQuery.refetch(),
    handleBooked: (booking) => setSelection({ filterKey, slotId: booking.slotId, booking }),
    startNewBooking: () => setSelection({ filterKey, slotId: null, booking: null }),
    shareUrl,
    copyStatus,
    copyShareLink: () => void copyShareLink(),
  }
}

function buildShareUrl(pathname: string, templeId: string, date: string): string {
  const url = new URL(pathname, window.location.origin)
  url.searchParams.set(TEMPLE_PARAM, templeId)
  url.searchParams.set(DATE_PARAM, date)
  return url.toString()
}

function getSlotsState(templeId: string, isError: boolean, options?: SlotOption[]): SlotsState {
  if (templeId === '') return { status: 'idle' }
  if (options) return { status: 'success', options }
  return { status: isError ? 'error' : 'loading' }
}
