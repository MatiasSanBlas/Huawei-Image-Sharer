import { describe, it, expect, beforeAll } from 'vitest'

/**
 * These tests run against a LIVE server (local or Vercel).
 * Set BASE_URL env var to target different environments:
 *   - Local:  http://localhost:3000
 *   - Vercel: https://your-app.vercel.app
 *
 * Run: BASE_URL=http://localhost:3000 npx vitest run tests/profile-cache.test.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

describe('GET /api/auth/profile — cache headers', () => {
  it('returns Cache-Control: no-store on 401 (unauthenticated)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    expect(res.status).toBe(401)

    const cc = res.headers.get('cache-control')
    expect(cc).toBeTruthy()
    expect(cc).toContain('no-store')
    expect(cc).toContain('no-cache')
    expect(cc).toContain('must-revalidate')
  })

  it('returns Cache-Control: private (not public)', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    const cc = res.headers.get('cache-control') || ''
    expect(cc).toContain('private')
    expect(cc).not.toContain('public')
  })

  it('does NOT return stale-while-revalidate or s-maxage', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`)
    const cc = res.headers.get('cache-control') || ''
    expect(cc).not.toContain('s-maxage')
    expect(cc).not.toContain('stale-while-revalidate')
  })
})

describe('POST /api/admin/approve — cache headers', () => {
  it('returns Cache-Control: no-store on 401 (unauthenticated)', async () => {
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
  it('returns Cache-Control: no-store on 401 (unauthenticated)', async () => {
    const res = await fetch(`${BASE}/api/admin/users`)
    expect(res.status).toBe(401)

    const cc = res.headers.get('cache-control')
    expect(cc).toContain('no-store')
  })
})
