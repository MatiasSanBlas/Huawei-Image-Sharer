import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || profile.status !== 'approved' || profile.role !== 'admin') {
      return NextResponse.json({
        error: 'Forbidden',
        debug: {
          profileErr: profileErr?.message || null,
          profileFound: !!profile,
          status: profile?.status || null,
          role: profile?.role || null,
        },
      }, { status: 403 })
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role, status, created_at')
      .order('created_at', { ascending: false })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ users: data || [] })
  } catch (err: any) {
    console.error('API /admin/users error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
