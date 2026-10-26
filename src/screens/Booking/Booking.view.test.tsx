import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slot } from '../../models/Temple.model'
import { darshanApi } from '../../services/api/MockApi'
import { db } from '../../services/api/MockDb'
import { fillDevoteeForm, renderWithProviders, setUpMockApi } from '../../test/TestUtils'
import { BookingView } from './Booking.view'

const TOMORROW_10AM = 'sabarimala-2026-10-27-1000'

function setSlot(slotId: string, remaining: number) {
  const slot = db.slots.get(slotId)
  if (!slot) throw new Error(`Unknown slot ${slotId}`)
  slot.remaining = remaining
}

async function openTomorrowAtSabarimala() {
  const result = renderWithProviders(<BookingView />)
  const { user } = result
  await user.selectOptions(await screen.findByLabelText('Temple'), 'sabarimala')
  await user.click(screen.getByRole('radio', { name: /27 Oct/ }))
  await screen.findByRole('radio', { name: /10:00 am/ })
  return result
}

describe('BookingView', () => {
  beforeEach(setUpMockApi)
  afterEach(() => vi.useRealTimers())

  it('books 3 tickets in a slot with 10 remaining and then shows 7 remaining', async () => {
    setSlot(TOMORROW_10AM, 10)
    const { user } = await openTomorrowAtSabarimala()

    await user.click(screen.getByRole('radio', { name: /10:00 am.*10 of 80 left/ }))
    await fillDevoteeForm(user, 3)
    await user.click(screen.getByRole('button', { name: 'Book darshan' }))

    const receipt = await screen.findByRole('article', { name: 'Darshan booking confirmed' })
    expect(within(receipt).getByRole('img', { name: /Entry QR code/ })).toBeInTheDocument()
    expect(within(receipt).getByText('98XXXXXX10')).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /10:00 am.*7 of 80 left/ })).toBeInTheDocument()
  })

  it('never offers more tickets than remain in the slot', async () => {
    setSlot(TOMORROW_10AM, 2)
    const { user } = await openTomorrowAtSabarimala()

    await user.click(screen.getByRole('radio', { name: /10:00 am/ }))

    const options = within(screen.getByLabelText('Number of tickets')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['1', '2'])
  })

  it('does not let devotees pick full slots or slots that have started', async () => {
    setSlot('sabarimala-2026-10-26-1000', 0)
    const { user } = renderWithProviders(<BookingView />)

    await user.selectOptions(await screen.findByLabelText('Temple'), 'sabarimala')

    expect(await screen.findByRole('radio', { name: /5:00 am.*Already started/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /10:00 am.*Full/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /4:30 pm/ })).toBeEnabled()
  })

  it('shows field errors and does not book when the form is invalid', async () => {
    const { user } = await openTomorrowAtSabarimala()
    await user.click(screen.getByRole('radio', { name: /10:00 am/ }))

    await user.type(screen.getByLabelText('Mobile number'), '12345')
    await user.click(screen.getByRole('button', { name: 'Book darshan' }))

    expect(await screen.findByText(/10-digit mobile number starting/)).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true')
    expect(db.bookings.size).toBe(0)
  })
})

describe('BookingView filters in the URL', () => {
  beforeEach(setUpMockApi)
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('opens a shared link on the same temple and date', async () => {
    renderWithProviders(<BookingView />, '/?temple=vaikom&date=2026-10-31')

    await waitFor(() => expect(screen.getByLabelText('Temple')).toHaveValue('vaikom'))
    expect(screen.getByRole('radio', { name: 'Sat, 31 Oct' })).toBeChecked()
    expect(await screen.findByRole('radio', { name: /6:30 pm/ })).toBeInTheDocument()
  })

  it('does not let a slow response for an earlier temple overwrite the current one', async () => {
    let resolveSlowRequest: (slots: Slot[]) => void = () => {}
    vi.spyOn(darshanApi, 'getSlots').mockImplementation((templeId) =>
      templeId === 'sabarimala'
        ? new Promise((resolve) => (resolveSlowRequest = resolve))
        : Promise.resolve([fakeSlot(templeId, 42)]),
    )
    const { user } = renderWithProviders(<BookingView />)

    await user.selectOptions(await screen.findByLabelText('Temple'), 'sabarimala')
    await user.selectOptions(screen.getByLabelText('Temple'), 'vaikom')
    expect(await screen.findByRole('radio', { name: /42 of 42 left/ })).toBeInTheDocument()

    await act(async () => resolveSlowRequest([fakeSlot('sabarimala', 99)]))

    expect(screen.getByRole('radio', { name: /42 of 42 left/ })).toBeInTheDocument()
    expect(screen.queryByText(/99 of 99 left/)).not.toBeInTheDocument()
  })
})

function fakeSlot(templeId: string, remaining: number): Slot {
  return {
    id: `${templeId}-2026-10-26-1830`,
    templeId,
    date: '2026-10-26',
    startsAt: '2026-10-26T13:00:00.000Z',
    capacity: remaining,
    remaining,
  }
}
