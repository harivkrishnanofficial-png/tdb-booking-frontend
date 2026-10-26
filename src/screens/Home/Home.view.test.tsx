import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeView } from './Home.view'

describe('HomeView', () => {
  it('shows the starter guidance', () => {
    render(<HomeView />)

    expect(
      screen.getByRole('heading', { name: 'A clean place to start.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Add a screen under src/screens.'),
    ).toBeInTheDocument()
  })
})
