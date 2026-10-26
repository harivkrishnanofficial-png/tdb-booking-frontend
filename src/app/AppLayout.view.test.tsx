import { screen, waitFor } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingView } from '../screens/Booking/Booking.view'
import { renderWithProviders, setUpMockApi } from '../test/TestUtils'
import { AppLayout } from './AppLayout.view'

type User = ReturnType<typeof userEvent.setup>

const MAX_TABS = 40

function renderApp() {
  return renderWithProviders(
    <AppLayout>
      <BookingView />
    </AppLayout>,
  )
}

/** Presses Tab until `element` has focus, failing if it cannot be reached by keyboard. */
async function tabTo(user: User, element: HTMLElement) {
  for (let presses = 0; presses < MAX_TABS && document.activeElement !== element; presses++) {
    await user.tab()
  }
  expect(element).toHaveFocus()
}

describe('AppLayout accessibility and language', () => {
  beforeEach(() => {
    localStorage.clear()
    setUpMockApi()
  })
  afterEach(() => vi.useRealTimers())

  it('completes a booking with the keyboard alone and moves focus to the ticket', async () => {
    const { user } = renderApp()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()

    const temple = await screen.findByLabelText('Temple')
    await tabTo(user, temple)
    // jsdom does not emulate arrow keys inside a native <select>; browsers do.
    await user.selectOptions(temple, 'sabarimala')

    // Only the selected day is in the tab order; arrows move, Enter picks.
    await tabTo(user, screen.getByRole('button', { name: /Monday 26 October/ }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /Tuesday 27 October/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /27 October/ }).closest('td')).toHaveAttribute('aria-selected', 'true')

    const firstSlot = await screen.findByRole('radio', { name: /5:00 am/ })
    await tabTo(user, firstSlot)
    await user.keyboard(' ')
    expect(firstSlot).toBeChecked()

    await tabTo(user, await screen.findByLabelText('First name'))
    await user.keyboard('Lakshmi')
    await user.tab()
    await user.keyboard('Nair')
    await user.tab()
    await user.keyboard('64')
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Female' })).toBeChecked()
    await tabTo(user, screen.getByLabelText('Mobile number'))
    await user.keyboard('9876543210')

    const idType = screen.getByLabelText('Government ID')
    await tabTo(user, idType)
    await user.selectOptions(idType, 'aadhaar')
    await user.tab()
    await user.keyboard('234567890123')

    await tabTo(user, screen.getByRole('checkbox', { name: /I agree/ }))
    await user.keyboard(' ')
    await tabTo(user, screen.getByRole('button', { name: 'Book darshan' }))
    await user.keyboard('{Enter}')

    const heading = await screen.findByRole('heading', { name: 'Darshan booking confirmed' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText(/Your booking reference is TDB-/)).toBeInTheDocument()
  })

  it('switches labels and date formats to Malayalam and remembers the choice', async () => {
    const { user, unmount } = renderApp()
    await screen.findByLabelText('Temple')

    await user.click(screen.getByRole('button', { name: 'മലയാളം' }))

    expect(screen.getByRole('heading', { level: 1, name: 'ദർശനം ബുക്ക് ചെയ്യുക' })).toBeInTheDocument()
    expect(screen.getByLabelText('ക്ഷേത്രം')).toBeInTheDocument()
    // The calendar month and day names follow the language.
    expect(screen.queryByRole('button', { name: /26 October/ })).not.toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /ഒക്.?ടോബർ/u })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ഒക്.?ടോബർ 26, തിങ്കളാഴ്.?ച/u })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'മലയാളം' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('lang', 'ml')

    unmount()
    renderApp()
    expect(await screen.findByLabelText('ക്ഷേത്രം')).toBeInTheDocument()
  })
})
