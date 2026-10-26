import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AppProviders } from '../app/AppProviders'
import { createQueryClient } from '../app/QueryClient'
import { configureMockApi, resetMockApi } from '../services/api/MockApi'

/** Monday 26 Oct 2026, 08:00 IST: today's 05:00 and 07:30 slots have started. */
export const FIXED_NOW = new Date('2026-10-26T08:00:00+05:30')

/**
 * Freezes the clock (Date only, so real timers keep user-event and waitFor
 * working) and gives each test fresh data on an instant, reliable network.
 */
export function setUpMockApi(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
  resetMockApi(FIXED_NOW)
  configureMockApi({ failureRate: 0, minLatencyMs: 0, maxLatencyMs: 0 })
}

/** Renders inside the real providers, at `route` (path plus query string). */
export function renderWithProviders(ui: ReactElement, route = '/') {
  // No pause between keystrokes: full-form flows otherwise approach the 5 s
  // test timeout when test files run in parallel.
  const user = userEvent.setup({ delay: null })
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders queryClient={createQueryClient(false)}>{ui}</AppProviders>
    </MemoryRouter>,
  )
  return { user, ...view }
}

type User = ReturnType<typeof userEvent.setup>

/** Fills every required field with valid details. */
export async function fillDevoteeForm(user: User, tickets = 1): Promise<void> {
  await user.type(screen.getByLabelText('First name'), 'Lakshmi')
  await user.type(screen.getByLabelText('Last name'), 'Nair')
  await user.type(screen.getByLabelText('Age'), '64')
  await user.click(screen.getByRole('radio', { name: 'Female' }))
  await user.type(screen.getByLabelText('Mobile number'), '9876543210')
  await user.selectOptions(screen.getByLabelText('Government ID'), 'aadhaar')
  await user.type(screen.getByLabelText('ID number'), '2345 6789 0123')
  await user.selectOptions(screen.getByLabelText('Number of tickets'), String(tickets))
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
}
