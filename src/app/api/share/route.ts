import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { shareImages, getProjectIdForRegion } from '@/lib/huawei-ims'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface ShareItem {
  imageId: string
  region: string
}

interface ShareRequest {
  items: ShareItem[]
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

    const { items, targetType, targetValue } = body

    if (!items?.length || !targetType || !targetValue) {
      return NextResponse.json(
        { error: 'items, targetType, and targetValue are required' },
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

    const byRegion: Record<string, string[]> = {}
    for (const item of items) {
      if (!byRegion[item.region]) byRegion[item.region] = []
      byRegion[item.region].push(item.imageId)
    }

    const results: { imageId: string; success: boolean; error?: string }[] = []

    for (const [region, imageIds] of Object.entries(byRegion)) {
      try {
        const projectId = getProjectIdForRegion(region)
        await shareImages(imageIds, targetType, targetValue, region, projectId)

        for (const imageId of imageIds) {
          results.push({ imageId, success: true })
          await supabaseAdmin.from('share_logs').insert({
            user_id: user.id,
            image_id: imageId,
            target_type: targetType,
            target_value: targetValue,
            status: 'success',
          })
        }
      } catch (err: any) {
        const errMsg = err.message || 'Unknown error'
        for (const imageId of imageIds) {
          results.push({ imageId, success: false, error: errMsg })
          await supabaseAdmin.from('share_logs').insert({
            user_id: user.id,
            image_id: imageId,
            target_type: targetType,
            target_value: targetValue,
            status: 'failed',
            error_message: errMsg,
          })
        }
      }
    }

    const allSuccess = results.every((r) => r.success)
    return NextResponse.json(
      { results },
      { status: allSuccess ? 200 : 207 }
    )
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
