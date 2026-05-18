import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { cookies } from 'next/headers'

export default async function RootPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (token) {
    const { data } = await supabase.auth.getUser(token)
    if (data.user) redirect('/dashboard')
  }

  redirect('/auth/login')
}
