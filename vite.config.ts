import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/Setup.ts',
    css: true,
    // Run in a non-IST zone, so tests prove times are shown in IST whatever the device zone.
    env: { TZ: 'America/New_York' },
  },
})
