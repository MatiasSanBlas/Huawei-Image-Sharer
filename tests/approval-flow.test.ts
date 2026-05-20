import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * End-to-end test for the user approval flow.
 *
 * Required env vars:
 *   - BASE_URL:           Server URL (http://localhost:3000 or https://xxx.vercel.app)
 *   - SUPABASE_URL:       Supabase project URL
 *   - SUPABASE_ANON_KEY:  Supabase anon key
 *   - ADMIN_EMAIL:        Admin account email
 *   - ADMIN_PASSWORD:     Admin account password
 *   - TEST_EMAIL:         Test user email (will be created if needed)
 *   - TEST_PASSWORD:      Test user password
 *
 * Run:
 *   BASE_URL=http://localhost:3000 \
 *   SUPABASE_URL=... \
 *   SUPABASE_ANON_KEY=... \
 *   ADMIN_EMAIL=... \
 *   ADMIN_PASSWORD=... \
 *   TEST_EMAIL=... \
 *   TEST_PASSWORD=... \
 *   npx vitest run tests/approval-flow.test.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign in failed for ${email}: ${error.message}`)
  return data.session!
}

async function getProfile(token: string) {
  const res = await fetch(`${BASE}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  return res.json() as Promise<{ status: string; role: string }>
}

async function approveUser(adminToken: string, userId: string, action: 'approve' | 'deny') {
  const res = await fetch(`${BASE}/api/admin/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ userId, action }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Approve failed: ${err.error}`)
  }
  return res.json()
}

async function getAdminUsers(adminToken: string) {
  const res = await fetch(`${BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Admin users fetch failed: ${res.status}`)
  return res.json() as Promise<{ users: Array<{ id: string; email: string; status: string; role: string }> }>
}

// Skip entire suite if env vars are missing
const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY &&
  process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD &&
  process.env.TEST_EMAIL && process.env.TEST_PASSWORD

describe.skipIf(!hasEnv)('Approval flow (E2E)', () => {
  let adminToken: string
  let testToken: string
  let testUserId: string

  beforeAll(async () => {
    adminToken = (await signIn(process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!)).access_token
    testToken = (await signIn(process.env.TEST_EMAIL!, process.env.TEST_PASSWORD!)).access_token

    // Get test user id from profile or admin users list
    const { data: session } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL!,
      password: process.env.TEST_PASSWORD!,
    })
    testUserId = session!.user.id
  })

  it('step 1: test user starts as pending', async () => {
    const profile = await getProfile(testToken)
    expect(profile.status).toBe('pending')
  })

  it('step 2: admin can see pending users', async () => {
    const { users } = await getAdminUsers(adminToken)
    const found = users.find((u) => u.id === testUserId)
    expect(found).toBeDefined()
    expect(found!.status).toBe('pending')
  })

  it('step 3: admin approves the test user', async () => {
    const result = await approveUser(adminToken, testUserId, 'approve')
    expect(result.user.status).toBe('approved')
  })

  it('step 4: test user profile IMMEDIATELY reflects approved status (no cache)', async () => {
    // This is the critical test — the bug was that this returned cached 'pending'
    const profile = await getProfile(testToken)
    expect(profile.status).toBe('approved')
  })

  it('step 5: profile response has no-store cache headers', async () => {
    const res = await fetch(`${BASE}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${testToken}` },
      cache: 'no-store',
    })
    const cc = res.headers.get('cache-control') || ''
    expect(cc).toContain('no-store')
    expect(cc).toContain('no-cache')
    expect(cc).toContain('must-revalidate')
  })

  it('step 6: second profile fetch also returns approved (no stale cache)', async () => {
    const profile = await getProfile(testToken)
    expect(profile.status).toBe('approved')
  })

  // Cleanup: reset test user back to pending
  it('cleanup: reset test user to pending', async () => {
    // Use admin to deny then we'd need a way to set back to pending
    // For now just deny to clean up — adjust as needed
    await approveUser(adminToken, testUserId, 'deny')
    const profile = await getProfile(testToken)
    expect(profile.status).toBe('denied')
  })
})
