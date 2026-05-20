import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const noStore = { headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate' } }

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, ...noStore })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ status: 'pending', role: 'user' }, noStore)
    }

    return NextResponse.json({ status: profile.status, role: profile.role }, noStore)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, ...noStore })
  }
}
