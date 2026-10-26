import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { PATHS } from '../navigation/paths'
import { BookingView } from '../screens/Booking/Booking.view'
import { AppLayout } from './AppLayout.view'
import { AppProviders } from './AppProviders'

// Most devotees land on booking; My Bookings loads only when it is opened.
const MyBookingsView = lazy(() =>
  import('../screens/MyBookings/MyBookings.view').then((module) => ({ default: module.MyBookingsView })),
)

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppLayout>
          <Suspense fallback={null}>
            <Routes>
              <Route path={PATHS.booking} element={<BookingView />} />
              <Route path={PATHS.myBookings} element={<MyBookingsView />} />
              <Route path="*" element={<Navigate to={PATHS.booking} replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </AppProviders>
    </BrowserRouter>
  )
}
