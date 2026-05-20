import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 15000,
    include: ['tests/**/*.test.ts'],
    env: {
      BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    },
  },
})
