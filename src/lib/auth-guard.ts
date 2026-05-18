import { supabase } from '@/lib/supabase-client'

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
