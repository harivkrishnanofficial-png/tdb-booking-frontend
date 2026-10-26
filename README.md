# TDB Darshan Booking (frontend)

A darshan ticket booking app for Travancore Devaswom Board temples, built with
React 19, TypeScript (strict) and Vite. It has no real backend: the app talks to
an in-memory mock API that behaves like a slow, unreliable network.

Devotees pick a temple, a day and a slot, then book with their details and a
government ID. They get a QR ticket that gate officers scan, and they can
cancel later from **My bookings**. The interface is in English and Malayalam.

## Requirements

- Node.js 22.11 or newer
- npm

## Run the app

```sh
npm install
npm run dev        # http://localhost:5173
```

## Run the checks

```sh
npm test           # Vitest + React Testing Library
npm run typecheck
npm run lint
npm run build      # typecheck + production build
```

## Pull requests

| Problem | Pull request |
| --- | --- |
| P1 – Slot list and booking form | [#2](https://github.com/harivkrishnanofficial-png/tdb-booking-frontend/pull/2) |
| P2 – Shareable filters | [#3](https://github.com/harivkrishnanofficial-png/tdb-booking-frontend/pull/3) |
| P3 – Safe submit | [#4](https://github.com/harivkrishnanofficial-png/tdb-booking-frontend/pull/4) |
| P4 – My bookings and cancellation | [#5](https://github.com/harivkrishnanofficial-png/tdb-booking-frontend/pull/5) |
| P5 – Accessibility and Malayalam | [#1](https://github.com/harivkrishnanofficial-png/tdb-booking-frontend/pull/1) |

Each PR description lists its assumptions and decisions.

## Project structure

```text
src/
├── app/                 App, routes, providers, layout (header, language switch)
├── common/
│   ├── constants/       AppConstants (IST, booking limits, age bands)
│   ├── localization/    En / Ml messages, I18n context and provider
│   └── styles/          Global design tokens (temple palette)
├── components/          StatusMessage (loading / empty / error)
├── models/              Temple and Booking domain types
├── navigation/          Route paths
├── screens/
│   ├── Booking/         Slot list, booking form, QR receipt
│   └── MyBookings/      Lookup and cancellation
├── services/
│   ├── api/             Mock API, in-memory DB, typed ApiError
│   └── security/        Encryption, keyed hashes, signing, masking
├── utils/               DateTime (IST) and Zod validators
└── test/                Test setup and helpers
```

Every screen is split into a view (`*.view.tsx`, markup), a view model
(`*.viewModel.ts`, state and behaviour), types (`*.types.ts`) and styles
(`*.module.css`).

## Key decisions

- **Mock API**: random 200–1500 ms latency and a 20% failure rate, with both
  lost requests and lost responses. Change it with `configureMockApi()`.
- **Personal data**: name, phone, email and ID number are encrypted with
  AES-GCM. Lookups use keyed hashes, and the UI only ever sees masked values.
- **Idempotent booking**: `createBooking(request, idempotencyKey)` replays the
  original booking for a repeated key, so retries never book twice.
- **Calendar**: an accessible month calendar (arrow keys, Page Up/Down, Enter)
  for the next 30 days, in the chosen language. The native date input was not
  used because it follows the device language.
- **Verification**: My bookings needs the mobile number and the ID number.
- **Times**: always shown in IST (`Asia/Kolkata`); tests run in New York time to
  prove it.

Frontend checks improve the user experience only. A real backend must repeat
every validation and authorisation check.

## Credits

Background photo: [Sabarimala sanctum](https://commons.wikimedia.org/wiki/File:Shabarimala.JPG)
by AnjanaMenon at Malayalam Wikipedia, licensed
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
