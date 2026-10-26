import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { PATHS } from '../navigation/paths'
import { BookingView } from '../screens/Booking/Booking.view'
import { MyBookingsView } from '../screens/MyBookings/MyBookings.view'
import { AppLayout } from './AppLayout.view'
import { AppProviders } from './AppProviders'

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppLayout>
          <Routes>
            <Route path={PATHS.booking} element={<BookingView />} />
            <Route path={PATHS.myBookings} element={<MyBookingsView />} />
            <Route path="*" element={<Navigate to={PATHS.booking} replace />} />
          </Routes>
        </AppLayout>
      </AppProviders>
    </BrowserRouter>
  )
}
