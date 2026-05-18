import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { shareImages } from '@/lib/huawei-ims'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
interface ShareRequest {
  imageIds: string[]
  targetType: 'project' | 'domain' | 'ou_urn'
  targetValue: string
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: ShareRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { imageIds, targetType, targetValue } = body

    if (!imageIds?.length || !targetType || !targetValue) {
      return NextResponse.json(
        { error: 'imageIds, targetType, and targetValue are required' },
        { status: 400 }
      )
    }

    const validTypes = ['project', 'domain', 'ou_urn']
    if (!validTypes.includes(targetType)) {
      return NextResponse.json(
        { error: `targetType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    try {
      const result = await shareImages(imageIds, targetType, targetValue)
      const results = imageIds.map((id: string) => ({ imageId: id, success: true }))

      for (const imageId of imageIds) {
        await supabaseAdmin.from('share_logs').insert({
          user_id: user.id,
          image_id: imageId,
          target_type: targetType,
          target_value: targetValue,
          status: 'success',
        })
      }

      return NextResponse.json({ results, jobId: result.job_id })
    } catch (err: any) {
      const errMsg = err.message || 'Unknown error'

      for (const imageId of imageIds) {
        await supabaseAdmin.from('share_logs').insert({
          user_id: user.id,
          image_id: imageId,
          target_type: targetType,
          target_value: targetValue,
          status: 'failed',
          error_message: errMsg,
        })
      }

      return NextResponse.json(
        { results: imageIds.map((id: string) => ({ imageId: id, success: false, error: errMsg })) },
        { status: 502 }
      )
    }
  } catch (err: any) {
    console.error('API /share error:', err)
    const detail: Record<string, any> = {
      error: err.message || 'Internal server error',
      name: err.name,
    }
    if (process.env.NODE_ENV === 'development') {
      detail.stack = err.stack
    }
    return NextResponse.json(detail, { status: 500 })
  }
}
