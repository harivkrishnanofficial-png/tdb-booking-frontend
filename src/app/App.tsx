import { BrowserRouter } from 'react-router'
import { BookingView } from '../screens/Booking/Booking.view'
import { AppLayout } from './AppLayout.view'
import { AppProviders } from './AppProviders'

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppLayout>
          <BookingView />
        </AppLayout>
      </AppProviders>
    </BrowserRouter>
  )
}
