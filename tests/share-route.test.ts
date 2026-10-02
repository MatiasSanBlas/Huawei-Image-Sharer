import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readShareStream, type ShareStreamEvent } from '../src/lib/share-stream'

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  shareImages: vi.fn(),
  getProjectIdForRegion: vi.fn(),
  insertLog: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ getAuthenticatedUser: mocks.authenticate }))
vi.mock('@/lib/huawei-ims', () => ({
  shareImages: mocks.shareImages,
  getProjectIdForRegion: mocks.getProjectIdForRegion,
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => ({ insert: mocks.insertLog }) },
}))

import { POST } from '../src/app/api/share/route'

function shareRequest(accept: string) {
  return new Request('http://localhost:3000/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: accept },
    body: JSON.stringify({
      items: [
        { imageId: 'one', region: 'la-south-2' },
        { imageId: 'two', region: 'la-south-2' },
        { imageId: 'three', region: 'sa-argentina-1' },
      ],
      targetType: 'project',
      targetValue: 'destination',
    }),
  })
}

describe('POST /api/share progress', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.authenticate.mockResolvedValue({ user: { id: 'user-1' }, error: null })
    mocks.getProjectIdForRegion.mockReturnValue('project-1')
    mocks.shareImages.mockResolvedValue({})
    mocks.insertLog.mockResolvedValue({ error: null })
  })

  it('streams confirmed image counts while retaining region batching', async () => {
    const response = await POST(shareRequest('application/x-ndjson'))
    const events: ShareStreamEvent[] = []
    const results = await readShareStream(response, (event) => events.push(event))

    expect(response.headers.get('content-type')).toContain('application/x-ndjson')
    expect(mocks.shareImages).toHaveBeenCalledTimes(2)
    expect(mocks.shareImages).toHaveBeenNthCalledWith(1, ['one', 'two'], 'project', 'destination', 'la-south-2', 'project-1')
    expect(events.map((event) => event.type)).toEqual(['start', 'region', 'progress', 'progress', 'region', 'progress', 'complete'])
    expect(events.filter((event) => event.type === 'progress').map((event) => event.completed)).toEqual([1, 2, 3])
    expect(results).toEqual([
      { imageId: 'one', success: true },
      { imageId: 'two', success: true },
      { imageId: 'three', success: true },
    ])
  })

  it('reports failed images and preserves the JSON response for other clients', async () => {
    mocks.shareImages.mockImplementation(async (_ids: string[], _type: string, _target: string, region: string) => {
      if (region === 'sa-argentina-1') throw new Error('Huawei rejected the target')
    })

    const response = await POST(shareRequest('application/json'))
    expect(response.status).toBe(207)
    const body = await response.json()
    expect(body.results).toEqual([
      { imageId: 'one', success: true },
      { imageId: 'two', success: true },
      { imageId: 'three', success: false, error: 'Huawei rejected the target' },
    ])
  })

  it('streams a failed region with a final count of processed images', async () => {
    mocks.shareImages.mockImplementation(async (_ids: string[], _type: string, _target: string, region: string) => {
      if (region === 'sa-argentina-1') throw new Error('Huawei rejected the target')
    })

    const response = await POST(shareRequest('application/x-ndjson'))
    const events: ShareStreamEvent[] = []
    const results = await readShareStream(response, (event) => events.push(event))
    const progress = events.filter((event) => event.type === 'progress')

    expect(progress.at(-1)).toMatchObject({ total: 3, completed: 3, succeeded: 2, failed: 1 })
    expect(results[2]).toEqual({ imageId: 'three', success: false, error: 'Huawei rejected the target' })
  })
})
