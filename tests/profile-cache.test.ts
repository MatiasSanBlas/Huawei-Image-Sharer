import { describe, it, expect } from 'vitest'

/**
 * These tests run against a LIVE server (local or Vercel).
 * Set BASE_URL env var to target different environments:
 *   - Local:  http://localhost:3000
 *   - Vercel: https://your-app.vercel.app
 *
 * Run: npx vitest run tests/profile-cache.test.ts
 *
 * Note: Vercel's edge network modifies Cache-Control headers — it strips
 * `private`, `no-cache`, and `must-revalidate` but preserves `no-store`
 * and `max-age=0`. The critical directive for preventing cache is `no-store`,
 * so we test for that as the hard requirement.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

describe('GET /api/auth/profile — cache headers', () => {
  it('returns 401 with Cache-Control: no-store (unauthenticated)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    expect(res.status).toBe(401)

    const cc = res.headers.get('cache-control')
    expect(cc).toBeTruthy()
    expect(cc).toContain('no-store')
  })

  it('has max-age=0 (no stale content)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    const cc = res.headers.get('cache-control') || ''
    expect(cc).toContain('max-age=0')
  })

  it('does NOT return s-maxage or stale-while-revalidate (no edge caching)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    const cc = res.headers.get('cache-control') || ''
    expect(cc).not.toContain('s-maxage')
    expect(cc).not.toContain('stale-while-revalidate')
  })

  it('does NOT return public (not cacheable by shared caches)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    const cc = res.headers.get('cache-control') || ''
    expect(cc).not.toContain('public')
  })
})

describe('POST /api/admin/approve — cache headers', () => {
  it('returns 401 with Cache-Control: no-store (unauthenticated)', async () => {
    const res = await fetch(`${BASE}/api/admin/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test', action: 'approve' }),
    })
    expect(res.status).toBe(401)

    const cc = res.headers.get('cache-control')
    expect(cc).toContain('no-store')
  })
})

describe('GET /api/admin/users — cache headers', () => {
  it('returns 401 with Cache-Control: no-store (unauthenticated)', async () => {
    const res = await fetch(`${BASE}/api/admin/users`)
    expect(res.status).toBe(401)

    const cc = res.headers.get('cache-control')
    expect(cc).toContain('no-store')
  })
})
