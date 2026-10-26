import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Devotee } from '../../models/Booking.model'
import { configureMockApi, darshanApi } from '../../services/api/MockApi'
import { renderWithProviders, setUpMockApi } from '../../test/TestUtils'
import { MyBookingsView } from './MyBookings.view'

const DEVOTEE: Devotee = {
  firstName: 'Lakshmi',
  lastName: 'Nair',
  age: 64,
  sex: 'female',
  phone: '9876543210',
  email: '',
  idType: 'aadhaar',
  idNumber: '234567890123',
}

function seedBooking(slotId: string) {
  return darshanApi.createBooking({ slotId, tickets: 2, devotee: DEVOTEE }, crypto.randomUUID())
}

async function findBookings(idNumber = DEVOTEE.idNumber) {
  const result = renderWithProviders(<MyBookingsView />)
  await result.user.type(screen.getByLabelText('Mobile number'), DEVOTEE.phone)
  await result.user.type(screen.getByLabelText('ID number'), idNumber)
  await result.user.click(screen.getByRole('button', { name: 'Find my bookings' }))
  return result
}

describe('MyBookingsView', () => {
  beforeEach(setUpMockApi)
  afterEach(() => vi.useRealTimers())

  it('shows a cancellation at once and rolls it back with an error when the API fails', async () => {
    await seedBooking('vaikom-2026-10-27-0730')
    const { user } = await findBookings()
    const card = await screen.findByRole('article', { name: /Vaikom/ })
    // Tests run in New York time: the slot must still read as 7:30 am IST.
    expect(card).toHaveTextContent(/Tuesday 27 October, 2026 · 7:30 am/)

    configureMockApi({ failureRate: 1, failureMode: 'lost-request', minLatencyMs: 200, maxLatencyMs: 200 })
    await user.click(within(card).getByRole('button', { name: 'Cancel booking' }))
    await user.click(within(card).getByRole('button', { name: 'Yes, cancel booking' }))

    expect(within(card).getByText('Cancelled')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/was not cancelled and is still active/)
    expect(within(card).getByText('Confirmed')).toBeInTheDocument()
  })

  it('has no cancel action for a booking whose darshan has started, and says why', async () => {
    await seedBooking('vaikom-2026-10-26-1630')
    vi.setSystemTime(new Date('2026-10-26T16:45:00+05:30'))
    await findBookings()

    const card = await screen.findByRole('article', { name: /Vaikom/ })
    expect(within(card).queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
    expect(card).toHaveTextContent(/Darshan started at 4:30 pm, so this booking can no longer be cancelled/)
  })

  it('does not show bookings when the ID does not match the phone', async () => {
    await seedBooking('vaikom-2026-10-27-0730')
    await findBookings('ABC1234567')

    expect(await screen.findByText('No bookings were found for these details.')).toBeInTheDocument()
  })
})
