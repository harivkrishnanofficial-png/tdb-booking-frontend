import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useI18n } from '../common/localization/I18nContext'
import { StatusMessage } from '../components/StatusMessage/StatusMessage.view'
import { PATHS } from '../navigation/paths'
import { BookingView } from '../screens/Booking/Booking.view'
import { AppLayout } from './AppLayout.view'
import { AppProviders } from './AppProviders'

// Most devotees land on booking; My Bookings loads only when it is opened.
const MyBookingsView = lazy(() =>
  import('../screens/MyBookings/MyBookings.view').then((module) => ({ default: module.MyBookingsView })),
)

/** Shown while a lazy route downloads, so slow networks never show a blank page. */
function RouteFallback() {
  const { t } = useI18n()
  return <StatusMessage kind="loading" message={t('common.loading')} />
}

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppLayout>
          <Suspense fallback={<RouteFallback />}>
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
