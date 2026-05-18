import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { listPrivateImages } from '@/lib/huawei-ims'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawImages = await listPrivateImages()

    const images = rawImages.map((img: any) => ({
      id: img.id,
      name: img.name,
      osVersion: img.__os_version || img.os_version,
      osType: img.__os_type || img.os_type,
      osBit: img.__os_bit || img.os_bit,
      platform: img.__platform || img.platform,
      size: img.__image_size || img.size,
      status: img.status,
      createdAt: img.created_at || img.createdAt,
    }))

    return NextResponse.json({ images })
  } catch (err: any) {
    console.error('API /images error:', err)
    const detail: Record<string, any> = {
      error: err.message || 'Internal server error',
      name: err.name,
    }
    if (process.env.NODE_ENV === 'development') {
      detail.stack = err.stack
      if (err.cause) detail.cause = String(err.cause)
    }
    return NextResponse.json(detail, { status: 500 })
  }
}
