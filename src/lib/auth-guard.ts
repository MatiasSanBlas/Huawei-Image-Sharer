import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing token' }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { user: null, error: 'Invalid token' }
  }

  return { user: data.user, error: null }
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('role, status')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return { profile: null, error: 'Profile not found' }
  }

  return { profile: data as { role: string; status: string }, error: null }
}

export async function requireApprovedUser(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser(request)
  if (authError || !user) {
    return { user: null, profile: null, error: 'Unauthorized' }
  }

  const { profile, error: profileError } = await getUserProfile(user.id)
  if (profileError || !profile) {
    return { user, profile: null, error: 'Profile not found' }
  }

  if (profile.status !== 'approved') {
    return { user, profile, error: `Account ${profile.status}` }
  }

  return { user, profile, error: null }
}
