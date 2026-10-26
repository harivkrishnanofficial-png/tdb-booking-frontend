import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slot } from '../../models/Temple.model'
import { configureMockApi, darshanApi } from '../../services/api/MockApi'
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

  it('shares the current temple and date on WhatsApp or as a copied link', async () => {
    const { user } = renderWithProviders(<BookingView />)
    await user.selectOptions(await screen.findByLabelText('Temple'), 'sabarimala')
    await user.click(screen.getByRole('radio', { name: 'Sat, 31 Oct' }))
    const link = 'http://localhost:3000/?temple=sabarimala&date=2026-10-31'

    const whatsapp = screen.getByRole('link', { name: 'Share on WhatsApp' })
    const message = new URL(whatsapp.getAttribute('href') ?? '').searchParams.get('text')
    expect(message).toBe(`Sabarimala Sree Dharma Sastha Temple darshan slots for Saturday 31 October: ${link}`)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await navigator.clipboard.readText()).toBe(link)
    expect(screen.getByText('Link copied. Paste it in any chat.')).toBeInTheDocument()
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

describe('BookingView safe submit', () => {
  beforeEach(setUpMockApi)
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('creates one booking when Book is double-clicked on a slow network', async () => {
    configureMockApi({ minLatencyMs: 300, maxLatencyMs: 300 })
    const createBooking = vi.spyOn(darshanApi, 'createBooking')
    const { user } = await openTomorrowAtSabarimala()
    await user.click(screen.getByRole('radio', { name: /10:00 am/ }))
    await fillDevoteeForm(user)

    await user.dblClick(screen.getByRole('button', { name: 'Book darshan' }))

    expect(screen.getByRole('button', { name: 'Booking…' })).toBeDisabled()
    await screen.findByRole('article', { name: 'Darshan booking confirmed' })
    expect(createBooking).toHaveBeenCalledTimes(1)
    expect(db.bookings.size).toBe(1)
  })

  it('keeps the form after a lost response, and the retry does not book twice', async () => {
    const { user } = await openTomorrowAtSabarimala()
    const slot = screen.getByRole('radio', { name: /10:00 am/ })
    const remainingBefore = db.slots.get(TOMORROW_10AM)?.remaining ?? 0
    await user.click(slot)
    await fillDevoteeForm(user, 2)

    // The server commits the booking, but the response never reaches the phone.
    configureMockApi({ failureRate: 1, failureMode: 'lost-response' })
    await user.click(screen.getByRole('button', { name: 'Book darshan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Booking failed/)
    expect(screen.getByLabelText('First name')).toHaveValue('Lakshmi')
    expect(screen.getByLabelText('ID number')).toHaveValue('2345 6789 0123')

    configureMockApi({ failureRate: 0 })
    await user.click(screen.getByRole('button', { name: 'Book darshan' }))

    await screen.findByRole('article', { name: 'Darshan booking confirmed' })
    expect(db.bookings.size).toBe(1)
    expect(db.slots.get(TOMORROW_10AM)?.remaining).toBe(remainingBefore - 2)
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
