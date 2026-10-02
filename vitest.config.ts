import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    testTimeout: 15000,
    include: ['tests/**/*.test.ts'],
    env: {
      BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    },
  },
})
