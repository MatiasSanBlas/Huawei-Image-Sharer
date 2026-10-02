import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-guard'
import { shareImages, getProjectIdForRegion } from '@/lib/huawei-ims'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ShareResult, ShareStreamEvent } from '@/lib/share-stream'

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

async function processShares(
  body: ShareRequest,
  userId: string,
  onProgress?: (event: ShareStreamEvent) => void
): Promise<ShareResult[]> {
  const { items, targetType, targetValue } = body
  const byRegion: Record<string, string[]> = {}
  for (const item of items) {
    if (!byRegion[item.region]) byRegion[item.region] = []
    byRegion[item.region].push(item.imageId)
  }

  const results: ShareResult[] = []
  let succeeded = 0
  let failed = 0

  for (const [region, imageIds] of Object.entries(byRegion)) {
    onProgress?.({ type: 'region', region })

    let regionError: string | undefined
    try {
      const projectId = getProjectIdForRegion(region)
      await shareImages(imageIds, targetType, targetValue, region, projectId)
    } catch (err: any) {
      regionError = err.message || 'Unknown error'
    }

    for (const imageId of imageIds) {
      const result: ShareResult = regionError
        ? { imageId, success: false, error: regionError }
        : { imageId, success: true }
      results.push(result)
      if (result.success) succeeded += 1
      else failed += 1

      try {
        const { error } = await supabaseAdmin.from('share_logs').insert({
          user_id: userId,
          image_id: imageId,
          target_type: targetType,
          target_value: targetValue,
          status: result.success ? 'success' : 'failed',
          ...(regionError ? { error_message: regionError } : {}),
        })
        if (error) console.error('Share log insert failed:', error)
      } catch (logError) {
        console.error('Share log insert failed:', logError)
      }

      onProgress?.({
        type: 'progress',
        region,
        total: items.length,
        completed: results.length,
        succeeded,
        failed,
      })
    }
  }

  return results
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

    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      const encoder = new TextEncoder()
      let closed = false
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const send = (event: ShareStreamEvent) => {
            if (closed) return
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            } catch {
              closed = true
            }
          }

          send({ type: 'start', total: items.length })
          void processShares(body, user.id, send)
            .then((results) => send({ type: 'complete', results }))
            .catch((err) => {
              console.error('API /share stream error:', err)
              send({ type: 'error', error: err.message || 'Internal server error' })
            })
            .finally(() => {
              if (!closed) controller.close()
              closed = true
            })
        },
        cancel() {
          closed = true
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    const results = await processShares(body, user.id)
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
