import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const noStore = { headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate' } }

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, ...noStore })
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || profile.status !== 'approved' || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, ...noStore })
    }

    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400, ...noStore })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400, ...noStore })
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json({ error: 'action must be approve or deny' }, { status: 400, ...noStore })
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied'

    const { data, error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .update({ status: newStatus })
      .eq('id', userId)
      .select('id, email, status')
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500, ...noStore })
    }

    return NextResponse.json({ user: data }, noStore)
  } catch (err: any) {
    console.error('API /admin/approve error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, ...noStore })
  }
}
